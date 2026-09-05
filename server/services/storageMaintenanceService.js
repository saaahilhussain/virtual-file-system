import crypto from "crypto";
import File from "../models/fileModel.js";
import User from "../models/userModel.js";
import StorageCleanup from "../models/storageCleanupModel.js";
import { deleteS3Files } from "./s3Service.js";
import {
  withStorageTransaction,
  removeFiles,
  reconcileSizes,
  UPLOAD_LIFETIME_MS,
} from "./storageService.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const LEASE_MS = 5 * 60 * 1000;

export async function expireAbandonedUploads({
  now = new Date(),
  limit = 100,
} = {}) {
  const cutoff = new Date(now.getTime() - UPLOAD_LIFETIME_MS);
  const candidates = await File.find({
    uploadCompletedAt: null,
    createdAt: { $lte: cutoff },
  })
    .sort({ createdAt: 1 })
    .limit(limit)
    .lean();
  let expired = 0;
  for (const candidate of candidates) {
    try {
      expired += await withStorageTransaction(
        candidate.userId,
        async ({ user, session }) => {
          const file = await File.findOne({
            _id: candidate._id,
            userId: user._id,
            uploadCompletedAt: null,
            createdAt: { $lte: cutoff },
          }).session(session);
          if (!file) return 0; // Completion or cancellation may have won the race.
          await removeFiles([file], user._id, session);
          return 1;
        },
      );
    } catch (error) {
      console.error(
        "Abandoned-upload cleanup failed",
        String(candidate._id),
        error.message,
      );
    }
  }
  return expired;
}

export async function processStorageCleanup({
  now = new Date(),
  limit = 100,
} = {}) {
  const jobs = [];
  const leaseToken = crypto.randomUUID();
  // Claim independently so multiple server/worker processes cannot own the
  // same job. Expired leases recover automatically after a process crash.
  for (let i = 0; i < Math.min(limit, 1000); i++) {
    const job = await StorageCleanup.findOneAndUpdate(
      {
        nextAttemptAt: { $lte: now },
        leaseUntil: { $lte: now },
      },
      { $set: { leaseToken, leaseUntil: new Date(now.getTime() + LEASE_MS) } },
      {
        sort: { nextAttemptAt: 1 },
        returnDocument: "after",
      },
    ).lean();
    if (!job) break;
    jobs.push(job);
  }
  if (!jobs.length) return { deleted: 0, failed: 0 };

  let result;
  let requestError;
  try {
    result = await deleteS3Files(jobs.map((job) => ({ Key: job._id })));
  } catch (error) {
    requestError = error;
  }
  const deleted = new Set((result?.Deleted || []).map((entry) => entry.Key));
  const errors = new Map(
    (result?.Errors || []).map((entry) => [
      entry.Key,
      entry.Code || "S3DeleteError",
    ]),
  );
  let failed = 0;
  for (const job of jobs) {
    const failure =
      requestError?.name ||
      errors.get(job._id) ||
      (!deleted.has(job._id) ? "MissingDeleteAcknowledgement" : null);
    const attempts = failure ? job.attempts + 1 : 0;
    if (failure) failed++;
    const delay = failure
      ? Math.min(60 * 60 * 1000, 1000 * 2 ** Math.min(attempts, 12))
      : DAY_MS;
    await StorageCleanup.updateOne(
      { _id: job._id, leaseToken },
      {
        $set: {
          attempts,
          lastError: failure || "",
          leaseUntil: new Date(0),
          nextAttemptAt: new Date(now.getTime() + delay),
          ...(!failure ? { lastDeletedAt: now } : {}),
        },
        $unset: { leaseToken: "" },
      },
    );
  }
  if (failed)
    console.error("S3 cleanup will retry", { failed, total: jobs.length });
  return { deleted: jobs.length - failed, failed };
}

export async function reconcileAccountStorage(userId) {
  return withStorageTransaction(userId, ({ user, session }) =>
    reconcileSizes(user._id, session),
  );
}

export function startStorageMaintenance({ intervalMs = 60_000 } = {}) {
  let stopped = false;
  let active;
  let timer;
  let userCursor;
  const tick = () => {
    active = (async () => {
      // Keep each phase independent: one failing account must not stop S3 retries.
      for (const work of [expireAbandonedUploads, processStorageCleanup]) {
        try {
          await work();
        } catch (error) {
          console.error("Storage maintenance failed", error.message);
        }
      }
      const users = await User.find(
        userCursor ? { _id: { $gt: userCursor } } : {},
        { _id: 1 },
      )
        .sort({ _id: 1 })
        .limit(10)
        .lean();
      for (const user of users) {
        try {
          await reconcileAccountStorage(user._id);
        } catch (error) {
          console.error(
            "Storage reconciliation failed",
            String(user._id),
            error.message,
          );
        }
      }
      userCursor = users.length === 10 ? users.at(-1)._id : undefined;
    })()
      .catch((error) =>
        console.error("Storage maintenance failed", error.message),
      )
      .finally(() => {
        if (!stopped) {
          timer = setTimeout(tick, intervalMs);
          timer.unref();
        }
      });
  };
  tick();
  return async () => {
    stopped = true;
    clearTimeout(timer);
    await active;
  };
}
