import crypto from "crypto";
import mongoose, { Types } from "mongoose";
import request from "supertest";
import {
  beforeAll,
  afterAll,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Subscription from "../models/subscriptionModel.js";
import BillingEvent from "../models/billingEventModel.js";
import { razorPayInstance } from "../services/razorpayService.js";
import { FREE_QUOTA_BYTES, getQuotaForPlan } from "../config/plans.js";
import { redisMock } from "./helpers/redisMock.js";

const PRO = process.env.RZP_PLAN_PRO_MONTHLY;
const PREMIUM = process.env.RZP_PLAN_PREMIUM_MONTHLY;
let app;
let replicaSet;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replicaSet.getUri());
  await BillingEvent.init();
  ({ default: app } = await import("../app.js"));
});
afterEach(async () => {
  vi.restoreAllMocks();
  vi.resetAllMocks();
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

async function account() {
  const userId = new Types.ObjectId();
  const rootDirId = new Types.ObjectId();
  await Directory.create({ _id: rootDirId, userId, name: "root" });
  const user = await User.create({
    _id: userId,
    rootDirId,
    name: "Billing User",
    email: `${userId}@example.com`,
  });
  const sid = crypto.randomUUID();
  await redisMock.json.set(`session:${sid}`, "$", {
    userId: String(userId),
    rootDirId: String(rootDirId),
    role: "user",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  });
  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET)
    .update(sid)
    .digest("base64")
    .replace(/=+$/, "");
  return { user, cookie: `sid=${encodeURIComponent(`s:${sid}.${signature}`)}` };
}

async function subscription(owner, overrides = {}) {
  return Subscription.create({
    userId: owner.user._id,
    planId: PRO,
    status: "created",
    razorpaySubscriptionId: `sub_${new Types.ObjectId()}`,
    ...overrides,
  });
}

function snapshot(sub, overrides = {}) {
  return {
    id: sub.razorpaySubscriptionId,
    plan_id: sub.planId,
    status: "active",
    paid_count: 1,
    ...overrides,
  };
}

function body(
  sub,
  {
    type = "subscription.charged",
    at = 1720000000,
    state = "active",
    plan = sub.planId,
  } = {},
) {
  return JSON.stringify({
    event: type,
    created_at: at,
    payload: {
      subscription: {
        entity: {
          id: sub.razorpaySubscriptionId,
          plan_id: plan,
          status: state,
        },
      },
    },
  });
}

function deliver(rawBody, id = crypto.randomUUID()) {
  const signature = crypto
    .createHmac("sha256", process.env.WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");
  const req = request(app)
    .post("/api/billing/webhook")
    .set("Content-Type", "application/json")
    .set("X-Razorpay-Signature", signature);
  if (id) req.set("X-Razorpay-Event-Id", id);
  return req.send(rawBody);
}

async function quota(owner) {
  return (await User.findById(owner.user._id)).maxStorageInBytes;
}

describe("billing event processing", () => {
  it("deduplicates simultaneous deliveries and skips provider fetch on subsequent replay", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    const raw = body(sub);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () => deliver(raw, "evt_same")),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect(await BillingEvent.countDocuments()).toBe(1);
    expect((await Subscription.findById(sub._id)).billingRevision).toBe(1);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
    vi.mocked(razorPayInstance.subscriptions.fetch).mockClear();
    expect((await deliver(raw, "evt_same")).body.duplicate).toBe(true);
    expect(razorPayInstance.subscriptions.fetch).not.toHaveBeenCalled();
  });

  it("uses current provider state when an old activation arrives after cancellation", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "active" });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { status: "cancelled" }),
    );
    expect(
      (
        await deliver(
          body(sub, {
            type: "subscription.cancelled",
            at: 200,
            state: "cancelled",
          }),
        )
      ).status,
    ).toBe(200);
    expect(
      (await deliver(body(sub, { type: "subscription.activated", at: 100 })))
        .status,
    ).toBe(200);
    expect((await Subscription.findById(sub._id)).status).toBe("cancelled");
    expect((await Subscription.findById(sub._id)).lastEventCreatedAt).toBe(200);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
  });

  it("handles conflicting events from the same second without inventing an ordering", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { plan_id: PREMIUM }),
    );
    expect(
      (
        await deliver(
          body(sub, { type: "subscription.updated", plan: PREMIUM }),
        )
      ).status,
    ).toBe(200);
    expect(
      (await deliver(body(sub, { type: "subscription.charged", plan: PRO })))
        .status,
    ).toBe(200);
    expect((await Subscription.findById(sub._id)).planId).toBe(PREMIUM);
    expect(await quota(owner)).toBe(getQuotaForPlan(PREMIUM));
  });

  it("refetches a slow response after another delivery commits newer state", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    let release;
    let started;
    const entered = new Promise((resolve) => {
      started = resolve;
    });
    vi.mocked(razorPayInstance.subscriptions.fetch)
      .mockImplementationOnce(() => {
        started();
        return new Promise((resolve) => {
          release = resolve;
        });
      })
      .mockResolvedValue(snapshot(sub, { plan_id: PREMIUM }));
    const slow = deliver(body(sub), "evt_slow").then((r) => r);
    await entered;
    expect(
      (
        await deliver(
          body(sub, {
            type: "subscription.updated",
            at: 1720000001,
            plan: PREMIUM,
          }),
          "evt_fast",
        )
      ).status,
    ).toBe(200);
    release(snapshot(sub, { plan_id: PRO }));
    expect((await slow).status).toBe(200);
    expect(razorPayInstance.subscriptions.fetch).toHaveBeenCalledTimes(3);
    expect(await quota(owner)).toBe(getQuotaForPlan(PREMIUM));
    expect(await BillingEvent.countDocuments()).toBe(2);
  });

  it("rolls back subscription and event bookkeeping if updating quota fails", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    const fault = vi
      .spyOn(User, "updateOne")
      .mockRejectedValueOnce(new Error("injected quota failure"));
    const raw = body(sub);
    expect((await deliver(raw, "evt_retry")).status).toBe(500);
    expect((await Subscription.findById(sub._id)).status).toBe("created");
    expect((await Subscription.findById(sub._id)).billingRevision).toBe(0);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
    expect(await BillingEvent.countDocuments()).toBe(0);
    fault.mockRestore();
    expect((await deliver(raw, "evt_retry")).status).toBe(200);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
  });

  it("rolls back quota and subscription when writing the event ledger fails", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    vi.spyOn(BillingEvent, "create").mockRejectedValueOnce(
      new Error("injected ledger failure"),
    );
    expect((await deliver(body(sub))).status).toBe(500);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
    expect((await Subscription.findById(sub._id)).status).toBe("created");
    expect(await BillingEvent.countDocuments()).toBe(0);
  });

  it("keeps provider outages retryable without acknowledging the event as processed", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockRejectedValueOnce(
      new Error("provider unavailable"),
    );
    const raw = body(sub);
    expect((await deliver(raw, "evt_outage")).status).toBe(503);
    expect(await BillingEvent.countDocuments()).toBe(0);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    expect((await deliver(raw, "evt_outage")).status).toBe(200);
  });

  it("allows retry when a webhook arrives before local subscription registration", async () => {
    const owner = await account();
    const raw = body({ razorpaySubscriptionId: "sub_early", planId: PRO });
    expect((await deliver(raw, "evt_early")).status).toBe(503);
    expect(await BillingEvent.countDocuments()).toBe(0);
    const sub = await subscription(owner, {
      razorpaySubscriptionId: "sub_early",
    });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    expect((await deliver(raw, "evt_early")).status).toBe(200);
  });

  it("rejects reuse of an event ID with a different signed payload", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    expect((await deliver(body(sub), "evt_collision")).status).toBe(200);
    expect(
      (await deliver(body(sub, { state: "cancelled" }), "evt_collision"))
        .status,
    ).toBe(409);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
  });

  it("rejects malformed signed events and ignores unrelated event types", async () => {
    expect((await deliver("{")).status).toBe(400);
    expect(
      (await deliver(JSON.stringify({ event: "subscription.charged" }))).status,
    ).toBe(400);
    const raw = body({ razorpaySubscriptionId: "sub_invalid", planId: PRO });
    expect((await deliver(raw, null)).status).toBe(400);
    expect(
      (await deliver(JSON.stringify({ event: "payment.captured" }))).status,
    ).toBe(200);
    expect(razorPayInstance.subscriptions.fetch).not.toHaveBeenCalled();
    expect(await BillingEvent.countDocuments()).toBe(0);
  });

  it("refuses an unconfigured paid plan instead of silently changing quota", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { plan_id: "plan_unconfigured" }),
    );
    expect((await deliver(body(sub))).status).toBe(503);
    expect(await BillingEvent.countDocuments()).toBe(0);
    expect((await Subscription.findById(sub._id)).status).toBe("created");
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
  });
});

describe("entitlement ownership and subscription actions", () => {
  it.each([1, 0])(
    "bootstraps legacy cancellation ownership from provider payment history (paid_count=%s)",
    async (paidCount) => {
      const owner = await account();
      const old = await subscription(owner, {
        status: "active",
        createdAt: new Date("2025-01-01"),
      });
      const replacement = await subscription(owner, {
        status: "cancelled",
        createdAt: new Date("2025-02-01"),
      });
      await Subscription.collection.updateOne(
        { _id: replacement._id },
        { $unset: { hasEntitlement: "", billingRevision: "" } },
      );
      vi.mocked(razorPayInstance.subscriptions.fetch).mockImplementation(
        async (id) =>
          id === replacement.razorpaySubscriptionId
            ? snapshot(replacement, {
                status: "cancelled",
                paid_count: paidCount,
              })
            : snapshot(old),
      );
      expect((await deliver(body(old))).status).toBe(200);
      expect(await quota(owner)).toBe(
        paidCount ? FREE_QUOTA_BYTES : getQuotaForPlan(PRO),
      );
      expect(
        (await Subscription.findById(replacement._id)).hasEntitlement,
      ).toBe(Boolean(paidCount));
    },
  );

  it("does not let an old cancellation revoke a replacement subscription", async () => {
    const owner = await account();
    const old = await subscription(owner, {
      status: "active",
      createdAt: new Date("2025-01-01"),
    });
    await subscription(owner, {
      status: "active",
      planId: PREMIUM,
      createdAt: new Date("2025-02-01"),
    });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(old, { status: "cancelled" }),
    );
    expect(
      (
        await deliver(
          body(old, { type: "subscription.cancelled", state: "cancelled" }),
        )
      ).status,
    ).toBe(200);
    expect(await quota(owner)).toBe(getQuotaForPlan(PREMIUM));
  });

  it("does not let old higher-tier events override a newer lower-tier subscription", async () => {
    const owner = await account();
    const old = await subscription(owner, {
      status: "active",
      planId: PREMIUM,
      createdAt: new Date("2025-01-01"),
    });
    await subscription(owner, {
      status: "active",
      planId: PRO,
      createdAt: new Date("2025-02-01"),
    });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(old),
    );
    expect((await deliver(body(old))).status).toBe(200);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
  });

  it("does not fall back to an obsolete paid subscription after the replacement ends", async () => {
    const owner = await account();
    const old = await subscription(owner, {
      status: "active",
      createdAt: new Date("2025-01-01"),
    });
    const replacement = await subscription(owner, {
      status: "active",
      planId: PREMIUM,
      createdAt: new Date("2025-02-01"),
    });
    vi.mocked(razorPayInstance.subscriptions.fetch)
      .mockResolvedValueOnce(snapshot(replacement, { status: "cancelled" }))
      .mockResolvedValue(snapshot(old));
    expect(
      (await deliver(body(replacement, { type: "subscription.cancelled" })))
        .status,
    ).toBe(200);
    expect((await deliver(body(old))).status).toBe(200);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
  });

  it("does not grant paid quota to an unpaid pending checkout", async () => {
    const owner = await account();
    const sub = await subscription(owner);
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { status: "pending", paid_count: 0 }),
    );
    expect(
      (await deliver(body(sub, { type: "subscription.pending" }))).status,
    ).toBe(200);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
    expect((await Subscription.findById(sub._id)).hasEntitlement).toBe(false);
  });

  it("does not infer paid access from a legacy pending status without payment history", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "pending" });
    await Subscription.collection.updateOne(
      { _id: sub._id },
      { $unset: { hasEntitlement: "", billingRevision: "" } },
    );
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { status: "pending", paid_count: 0 }),
    );
    expect(
      (await deliver(body(sub, { type: "subscription.pending" }))).status,
    ).toBe(200);
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
    expect((await Subscription.findById(sub._id)).hasEntitlement).toBe(false);
  });

  it("keeps existing paid access when a newer unpaid checkout expires", async () => {
    const owner = await account();
    await subscription(owner, {
      status: "active",
      createdAt: new Date("2025-01-01"),
    });
    const unpaid = await subscription(owner, {
      createdAt: new Date("2025-02-01"),
    });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(unpaid, { status: "expired", paid_count: 0 }),
    );
    expect(
      (await deliver(body(unpaid, { type: "subscription.expired" }))).status,
    ).toBe(200);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
  });

  it("retains established quota while paused or awaiting a retry", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "active" });
    for (const status of ["paused", "pending", "halted"]) {
      vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
        snapshot(sub, { status }),
      );
      expect(
        (await deliver(body(sub, { type: `subscription.${status}` }))).status,
      ).toBe(200);
      expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
    }
  });

  it("does not replace paid access with an authenticated checkout awaiting activation", async () => {
    const owner = await account();
    await subscription(owner, {
      status: "active",
      createdAt: new Date("2025-01-01"),
    });
    const future = await subscription(owner, {
      createdAt: new Date("2025-02-01"),
    });
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(future, { status: "authenticated", paid_count: 1 }),
    );
    expect(
      (await deliver(body(future, { type: "subscription.authenticated" })))
        .status,
    ).toBe(200);
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
    expect((await Subscription.findById(future._id)).hasEntitlement).toBe(
      false,
    );
  });

  it("does not let a delayed pause response overwrite a cancellation webhook", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "active" });
    let release;
    let started;
    const entered = new Promise((resolve) => {
      started = resolve;
    });
    vi.mocked(razorPayInstance.subscriptions.pause).mockImplementationOnce(
      () => {
        started();
        return new Promise((resolve) => {
          release = resolve;
        });
      },
    );
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { status: "cancelled" }),
    );
    const paused = request(app)
      .post("/subscriptions/pause")
      .set("Cookie", owner.cookie)
      .send({})
      .then((r) => r);
    await entered;
    expect(
      (await deliver(body(sub, { type: "subscription.cancelled" }))).status,
    ).toBe(200);
    release(snapshot(sub, { status: "paused" }));
    expect((await paused).status).toBe(200);
    expect((await Subscription.findById(sub._id)).status).toBe("cancelled");
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
  });

  it("updates quota immediately on API cancellation without waiting for its webhook", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "active" });
    await User.updateOne(
      { _id: owner.user._id },
      { maxStorageInBytes: getQuotaForPlan(PRO) },
    );
    vi.mocked(razorPayInstance.subscriptions.cancel).mockResolvedValue(
      snapshot(sub, { status: "cancelled" }),
    );
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub, { status: "cancelled" }),
    );
    const response = await request(app)
      .post("/subscriptions/cancel")
      .set("Cookie", owner.cookie)
      .send({ cancelAtCycleEnd: false });
    expect(response.status).toBe(200);
    expect(response.body.subscription.status).toBe("cancelled");
    expect(await quota(owner)).toBe(FREE_QUOTA_BYTES);
  });

  it("keeps paid access for a cancellation scheduled at cycle end", async () => {
    const owner = await account();
    const sub = await subscription(owner, { status: "active" });
    vi.mocked(razorPayInstance.subscriptions.cancel).mockResolvedValue(
      snapshot(sub),
    );
    vi.mocked(razorPayInstance.subscriptions.fetch).mockResolvedValue(
      snapshot(sub),
    );
    const response = await request(app)
      .post("/subscriptions/cancel")
      .set("Cookie", owner.cookie)
      .send({});
    expect(response.status).toBe(200);
    expect(razorPayInstance.subscriptions.cancel).toHaveBeenCalledWith(
      sub.razorpaySubscriptionId,
      true,
    );
    expect(await quota(owner)).toBe(getQuotaForPlan(PRO));
  });
});
