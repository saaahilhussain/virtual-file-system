import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import Directory from "../models/directoryModel.js";
import Otp from "../models/otpModel.js";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import { FREE_QUOTA_BYTES } from "../config/plans.js";
import { redisMock } from "./helpers/redisMock.js";

let app;
let replicaSet;

function signedSessionCookie(sessionId) {
  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(sessionId)
    .digest("base64")
    .replace(/=+$/, "");
  return `sid=${encodeURIComponent(`s:${sessionId}.${signature}`)}`;
}

async function createUserWithSession({ role = "user", email, password } = {}) {
  const userId = new Types.ObjectId();
  const rootDirId = new Types.ObjectId();
  const resolvedEmail = email || `${userId}@example.com`;

  await Directory.create({
    _id: rootDirId,
    name: `root-${resolvedEmail}`,
    parentDirId: null,
    path: [rootDirId],
    userId,
  });
  const user = await User.create({
    _id: userId,
    name: "Test User",
    email: resolvedEmail,
    password,
    rootDirId,
    role,
  });

  const sessionId = crypto.randomUUID();
  await redisMock.json.set(`session:${sessionId}`, "$", {
    userId: userId.toString(),
    rootDirId: rootDirId.toString(),
    role,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  });

  return {
    user,
    rootDirId,
    sessionId,
    cookie: signedSessionCookie(sessionId),
  };
}

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replicaSet.getUri());
  ({ default: app } = await import("../app.js"));
});

afterEach(async () => {
  vi.clearAllMocks();
  redisMock.reset();
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({}),
    ),
  );
});

afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet?.stop();
});

describe("registration and sessions", () => {
  it("rejects registration without a server-issued email grant", async () => {
    const response = await request(app).post("/user/register").send({
      name: "New User",
      email: "new@example.com",
      password: "secret1",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.registrationToken).toBeDefined();
    expect(await User.countDocuments()).toBe(0);
  });

  it("registers only after OTP verification and creates a signed-in session", async () => {
    const email = "verified@example.com";
    const otp = "123456";
    await Otp.create({
      email,
      purpose: "registration",
      codeHash: crypto.createHash("sha256").update(otp).digest("hex"),
    });

    const verification = await request(app)
      .post("/auth/verify-otp")
      .send({ email, otp });
    expect(verification.status).toBe(200);
    expect(verification.body.registrationToken).toMatch(/^[0-9a-f-]{36}$/i);

    const registration = await request(app).post("/user/register").send({
      name: "Verified User",
      email,
      password: "secret1",
      registrationToken: verification.body.registrationToken,
    });

    expect(registration.status).toBe(201);
    expect(registration.headers["set-cookie"]?.[0]).toContain("sid=");
    const user = await User.findOne({ email });
    expect(user).not.toBeNull();
    expect(await Directory.findById(user.rootDirId)).not.toBeNull();
  });

  it("logout-all invalidates the current Redis session", async () => {
    const account = await createUserWithSession();

    const logout = await request(app)
      .post("/user/logout-all")
      .set("Cookie", account.cookie);
    expect(logout.status).toBe(204);

    const profile = await request(app)
      .get("/user")
      .set("Cookie", account.cookie);
    expect(profile.status).toBe(401);
  });

  it("evicts the oldest session when the two-session cap is exceeded", async () => {
    const account = await createUserWithSession({ password: "secret1" });

    const secondLogin = await request(app).post("/user/login").send({
      email: account.user.email,
      password: "secret1",
    });
    const thirdLogin = await request(app).post("/user/login").send({
      email: account.user.email,
      password: "secret1",
    });

    expect(secondLogin.status).toBe(200);
    expect(thirdLogin.status).toBe(200);
    expect(
      (await redisMock.ft.search("userIdIdx", `@userId:{${account.user._id}}`))
        .documents,
    ).toHaveLength(2);

    const oldestSessionRequest = await request(app)
      .get("/user")
      .set("Cookie", account.cookie);
    expect(oldestSessionRequest.status).toBe(401);
  });
});

describe("administrative authorization", () => {
  it("prevents a manager from deleting a higher-privileged account", async () => {
    const manager = await createUserWithSession({ role: "manager" });
    const admin = await createUserWithSession({ role: "admin" });

    const response = await request(app)
      .delete(`/users/${admin.user._id}`)
      .set("Cookie", manager.cookie);

    expect(response.status).toBe(403);
    expect((await User.findById(admin.user._id)).isDeleted).toBe(false);
  });

  it("invalidates sessions when an owner changes a user's role", async () => {
    const owner = await createUserWithSession({ role: "owner" });
    const target = await createUserWithSession({ role: "user" });

    const response = await request(app)
      .put(`/users/role/${target.user._id}`)
      .set("Cookie", owner.cookie)
      .send({ role: "manager" });
    expect(response.status).toBe(200);
    expect((await User.findById(target.user._id)).role).toBe("manager");

    const staleSessionRequest = await request(app)
      .get("/user")
      .set("Cookie", target.cookie);
    expect(staleSessionRequest.status).toBe(401);
  });
});

describe("protected system invariants", () => {
  it("does not allow the account root directory to be trashed", async () => {
    const account = await createUserWithSession();

    const response = await request(app)
      .delete(`/directory/${account.rootDirId}`)
      .set("Cookie", account.cookie);

    expect(response.status).toBe(400);
    expect((await Directory.findById(account.rootDirId)).isTrashed).toBe(false);
  });

  it("rejects subscription plan IDs outside the configured allowlist", async () => {
    const account = await createUserWithSession();

    const response = await request(app)
      .post("/subscriptions/create")
      .set("Cookie", account.cookie)
      .send({ planId: "plan_not_configured" });

    expect(response.status).toBe(400);
  });

  it("verifies the raw Razorpay payload and accepts provider status names", async () => {
    const account = await createUserWithSession();
    account.user.maxStorageInBytes = 200 * 1024 ** 3;
    await account.user.save();

    const subscription = await Subscription.create({
      userId: account.user._id,
      planId: process.env.RZP_PLAN_PRO_MONTHLY,
      razorpaySubscriptionId: "sub_test_cancelled",
      status: "active",
    });
    const rawBody = JSON.stringify({
      event: "subscription.cancelled",
      payload: {
        subscription: {
          entity: {
            id: subscription.razorpaySubscriptionId,
            plan_id: subscription.planId,
            status: "cancelled",
          },
        },
      },
    });
    const signature = crypto
      .createHmac("sha256", process.env.WEBHOOK_SECRET)
      .update(rawBody)
      .digest("hex");

    const response = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .send(rawBody);

    expect(response.status).toBe(200);
    expect((await Subscription.findById(subscription._id)).status).toBe(
      "cancelled",
    );
    expect((await User.findById(account.user._id)).maxStorageInBytes).toBe(
      FREE_QUOTA_BYTES,
    );

    const duplicate = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", signature)
      .send(rawBody);
    expect(duplicate.status).toBe(200);
    expect((await User.findById(account.user._id)).maxStorageInBytes).toBe(
      FREE_QUOTA_BYTES,
    );
  });

  it("rejects a Razorpay webhook with an invalid signature", async () => {
    const response = await request(app)
      .post("/api/billing/webhook")
      .set("Content-Type", "application/json")
      .set("X-Razorpay-Signature", "invalid")
      .send(JSON.stringify({ event: "subscription.cancelled" }));

    expect(response.status).toBe(400);
  });
});
