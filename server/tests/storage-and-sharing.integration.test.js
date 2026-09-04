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
import File from "../models/fileModel.js";
import Share from "../models/shareModel.js";
import User from "../models/userModel.js";
import {
  deleteS3File,
  deleteS3Files,
  getFileMetaData,
} from "../services/s3Service.js";
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

async function createAccount() {
  const userId = new Types.ObjectId();
  const rootDirId = new Types.ObjectId();
  await Directory.create({
    _id: rootDirId,
    name: "root-test",
    parentDirId: null,
    path: [rootDirId],
    userId,
  });
  const user = await User.create({
    _id: userId,
    name: "Storage User",
    email: `${userId}@example.com`,
    rootDirId,
  });
  const sessionId = crypto.randomUUID();
  await redisMock.json.set(`session:${sessionId}`, "$", {
    userId: userId.toString(),
    rootDirId: rootDirId.toString(),
    role: "user",
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  });
  return {
    user,
    rootDirId,
    cookie: signedSessionCookie(sessionId),
  };
}

async function createDirectory({ name, parent, account, size = 0 }) {
  const id = new Types.ObjectId();
  const parentPath = parent?.path || [account.rootDirId];
  return Directory.create({
    _id: id,
    name,
    size,
    parentDirId: parent?._id || account.rootDirId,
    path: [...parentPath, id],
    userId: account.user._id,
  });
}

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replicaSet.getUri());
  ({ default: app } = await import("../app.js"));
});

afterEach(async () => {
  redisMock.reset();
  vi.clearAllMocks();
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

describe("file upload lifecycle", () => {
  it("initiates, verifies and completes an upload exactly once", async () => {
    const account = await createAccount();

    const initiated = await request(app)
      .post("/file/upload/initiate")
      .set("Cookie", account.cookie)
      .send({ name: "report.pdf", size: 128, contentType: "application/pdf" });
    expect(initiated.status).toBe(201);
    expect(initiated.body.uploadUrl).toBe("https://s3.example.test/upload");

    vi.mocked(getFileMetaData).mockResolvedValue({ ContentLength: 128 });
    const completed = await request(app)
      .post("/file/upload/complete")
      .set("Cookie", account.cookie)
      .send({ fileId: initiated.body.fileId });
    expect(completed.status).toBe(200);
    expect((await Directory.findById(account.rootDirId)).size).toBe(128);

    const repeated = await request(app)
      .post("/file/upload/complete")
      .set("Cookie", account.cookie)
      .send({ fileId: initiated.body.fileId });
    expect(repeated.status).toBe(200);
    expect((await Directory.findById(account.rootDirId)).size).toBe(128);
  });

  it("removes metadata and the S3 object when the uploaded size mismatches", async () => {
    const account = await createAccount();
    const initiated = await request(app)
      .post("/file/upload/initiate")
      .set("Cookie", account.cookie)
      .send({
        name: "bad.bin",
        size: 100,
        contentType: "application/octet-stream",
      });

    vi.mocked(getFileMetaData).mockResolvedValue({ ContentLength: 99 });
    const completed = await request(app)
      .post("/file/upload/complete")
      .set("Cookie", account.cookie)
      .send({ fileId: initiated.body.fileId });

    expect(completed.status).toBe(400);
    expect(await File.findById(initiated.body.fileId)).toBeNull();
    expect(deleteS3File).toHaveBeenCalledOnce();
    expect((await Directory.findById(account.rootDirId)).size).toBe(0);
  });

  it("cancels an incomplete upload without changing quota usage", async () => {
    const account = await createAccount();
    const initiated = await request(app)
      .post("/file/upload/initiate")
      .set("Cookie", account.cookie)
      .send({
        name: "cancel.bin",
        size: 100,
        contentType: "application/octet-stream",
      });

    const cancelled = await request(app)
      .delete("/file/upload/cancel")
      .set("Cookie", account.cookie)
      .send({ fileId: initiated.body.fileId });

    expect(cancelled.status).toBe(200);
    expect(await File.findById(initiated.body.fileId)).toBeNull();
    expect((await Directory.findById(account.rootDirId)).size).toBe(0);
  });
});

describe("recursive directory lifecycle", () => {
  it("trashes and restores a nested subtree while preserving quota totals", async () => {
    const account = await createAccount();
    const parent = await createDirectory({
      name: "parent",
      parent: null,
      account,
      size: 75,
    });
    const child = await createDirectory({
      name: "child",
      parent,
      account,
      size: 75,
    });
    const file = await File.create({
      name: "nested.txt",
      size: 75,
      extension: ".txt",
      userId: account.user._id,
      parentDirId: child._id,
      uploadCompletedAt: new Date(),
    });
    await Directory.findByIdAndUpdate(account.rootDirId, { size: 75 });

    const trashed = await request(app)
      .delete(`/directory/${parent._id}`)
      .set("Cookie", account.cookie);
    expect(trashed.status).toBe(200);
    expect((await Directory.findById(account.rootDirId)).size).toBe(0);
    expect((await Directory.findById(child._id)).isTrashed).toBe(true);
    expect((await File.findById(file._id)).isTrashed).toBe(true);

    const restored = await request(app)
      .patch(`/directory/${parent._id}/restore`)
      .set("Cookie", account.cookie);
    expect(restored.status).toBe(200);
    expect((await Directory.findById(account.rootDirId)).size).toBe(75);
    expect((await Directory.findById(child._id)).isTrashed).toBe(false);
    expect((await File.findById(file._id)).isTrashed).toBe(false);
  });

  it("permanently deletes metadata and S3 objects for a subtree", async () => {
    const account = await createAccount();
    const parent = await createDirectory({
      name: "parent",
      parent: null,
      account,
      size: 25,
    });
    const file = await File.create({
      name: "nested.txt",
      size: 25,
      extension: ".txt",
      userId: account.user._id,
      parentDirId: parent._id,
      uploadCompletedAt: new Date(),
    });
    await Directory.findByIdAndUpdate(account.rootDirId, { size: 25 });

    const deleted = await request(app)
      .delete(`/directory/${parent._id}/permanent`)
      .set("Cookie", account.cookie);

    expect(deleted.status).toBe(200);
    expect(await Directory.findById(parent._id)).toBeNull();
    expect(await File.findById(file._id)).toBeNull();
    expect(deleteS3Files).toHaveBeenCalledOnce();
    expect((await Directory.findById(account.rootDirId)).size).toBe(0);
  });
});

describe("share access boundaries", () => {
  it("does not allow a folder share to navigate outside its subtree", async () => {
    const account = await createAccount();
    const sharedRoot = await createDirectory({
      name: "shared",
      parent: null,
      account,
    });
    const outside = await createDirectory({
      name: "private",
      parent: null,
      account,
    });

    const created = await request(app)
      .post("/share")
      .set("Cookie", account.cookie)
      .send({ resourceType: "directory", resourceId: sharedRoot._id });
    const token = created.body.share.token;

    expect((await request(app).get(`/public/share/${token}`)).status).toBe(200);
    const traversal = await request(app).get(
      `/public/share/${token}?dir=${outside._id}`,
    );
    expect(traversal.status).toBe(403);
  });

  it("requires an allowlisted signed-in email for restricted links", async () => {
    const owner = await createAccount();
    const allowed = await createAccount();
    const sharedFile = await File.create({
      name: "private.pdf",
      size: 10,
      extension: ".pdf",
      userId: owner.user._id,
      parentDirId: owner.rootDirId,
      uploadCompletedAt: new Date(),
    });
    const created = await request(app)
      .post("/share")
      .set("Cookie", owner.cookie)
      .send({ resourceType: "file", resourceId: sharedFile._id });
    const shareId = created.body.share.id;
    const token = created.body.share.token;

    await request(app)
      .patch(`/share/${shareId}`)
      .set("Cookie", owner.cookie)
      .send({ accessType: "restricted", allowedEmails: [allowed.user.email] });

    expect((await request(app).get(`/public/share/${token}`)).status).toBe(401);
    expect(
      (
        await request(app)
          .get(`/public/share/${token}`)
          .set("Cookie", allowed.cookie)
      ).status,
    ).toBe(200);
    expect(await Share.countDocuments({ isActive: true })).toBe(1);
  });
});
