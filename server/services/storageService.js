import mongoose from "mongoose";
import File from "../models/fileModel.js";
import Directory from "../models/directoryModel.js";
import Share from "../models/shareModel.js";
import StorageCleanup from "../models/storageCleanupModel.js";

export const UPLOAD_LIFETIME_MS = 24 * 60 * 60 * 1000;

export function storageError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Keep the storage API while sharing the same account transaction with billing.
export { withAccountTransaction as withStorageTransaction } from "./accountTransactionService.js";

// Pending file rows ARE the reservations. Summing the source records avoids a
// second mutable quota counter and includes legacy pending uploads immediately.
export async function assertQuota(user, session, extraBytes = 0) {
  const [totals] = await File.aggregate([
    { $match: { userId: user._id, isTrashed: false } },
    { $group: { _id: null, bytes: { $sum: "$size" } } },
  ]).session(session);
  if ((totals?.bytes || 0) + extraBytes > user.maxStorageInBytes) {
    throw storageError(
      429,
      "Storage quota exceeded (including pending uploads)",
    );
  }
}

export async function liveAncestors(parentId, userId, session) {
  const ancestors = [];
  const visited = new Set();
  while (parentId) {
    if (visited.has(String(parentId)))
      throw storageError(409, "Directory cycle detected");
    visited.add(String(parentId));
    const dir = await Directory.findOne({ _id: parentId, userId }).session(
      session,
    );
    if (!dir || dir.isTrashed)
      throw storageError(409, "Parent directory is missing or trashed");
    ancestors.push(dir);
    parentId = dir.parentDirId;
  }
  return ancestors;
}

export async function adjustAncestorSizes(parentId, userId, delta, session) {
  const ancestors = await liveAncestors(parentId, userId, session);
  for (const dir of ancestors) {
    // Do not clamp a corrupted counter and silently hide accounting drift.
    const result = await Directory.updateOne(
      { _id: dir._id, userId, size: { $gte: Math.max(0, -delta) } },
      { $inc: { size: delta } },
      { session },
    );
    if (!result.matchedCount)
      throw storageError(409, "Directory accounting requires reconciliation");
  }
}

export async function collectSubtree(id, userId, session) {
  const ids = [];
  const visited = new Set();
  const queue = [id];
  for (let i = 0; i < queue.length; i++) {
    const current = queue[i];
    if (visited.has(String(current)))
      throw storageError(409, "Directory cycle detected");
    visited.add(String(current));
    ids.push(current);
    const children = await Directory.find(
      { parentDirId: current, userId },
      { _id: 1 },
    )
      .session(session)
      .lean();
    queue.push(...children.map((dir) => dir._id));
  }
  return ids;
}

export async function queueFileDeletion(files, session) {
  // Never expire these tombstones automatically: an already-issued S3 PUT may
  // finish after cancellation. Periodic re-deletion catches late object writes.
  if (!files.length) return;
  await StorageCleanup.bulkWrite(
    files.map((file) => ({
      updateOne: {
        filter: { _id: `${file._id}${file.extension}` },
        update: {
          $setOnInsert: {
            userId: file.userId,
            nextAttemptAt: new Date(),
            leaseUntil: new Date(0),
            attempts: 0,
            createdAt: new Date(),
          },
        },
        upsert: true,
      },
    })),
    { session },
  );
}

export async function removeFiles(files, userId, session) {
  if (!files.length) return;
  await queueFileDeletion(files, session);
  const ids = files.map((file) => file._id);
  await File.deleteMany({ _id: { $in: ids }, userId }).session(session);
  await Share.deleteMany({ fileId: { $in: ids } }).session(session);
}

// Source-of-truth repair. Trashed subtrees have zero active usage. Restoring a
// subtree recalculates its totals, including items individually trashed earlier.
export async function reconcileSizes(userId, session) {
  const dirs = await Directory.find({ userId }).session(session).lean();
  const byId = new Map(dirs.map((dir) => [String(dir._id), dir]));
  const sizes = new Map(dirs.map((dir) => [String(dir._id), 0]));
  const groups = await File.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(String(userId)),
        isTrashed: false,
        uploadCompletedAt: { $ne: null },
      },
    },
    { $group: { _id: "$parentDirId", bytes: { $sum: "$size" } } },
  ]).session(session);
  for (const group of groups) {
    const chain = [];
    const visited = new Set();
    let id = String(group._id);
    let visible = true;
    while (id) {
      const dir = byId.get(id);
      if (!dir || visited.has(id))
        throw storageError(
          409,
          "Invalid directory hierarchy; reconciliation stopped",
        );
      visited.add(id);
      if (dir.isTrashed) visible = false;
      chain.push(id);
      id = dir.parentDirId ? String(dir.parentDirId) : null;
    }
    if (visible)
      for (const ancestor of chain)
        sizes.set(ancestor, sizes.get(ancestor) + group.bytes);
  }
  const changes = dirs.filter((dir) => dir.size !== sizes.get(String(dir._id)));
  if (changes.length)
    await Directory.bulkWrite(
      changes.map((dir) => ({
        updateOne: {
          filter: { _id: dir._id, userId },
          update: { $set: { size: sizes.get(String(dir._id)) } },
        },
      })),
      { session },
    );
  return changes.length;
}
