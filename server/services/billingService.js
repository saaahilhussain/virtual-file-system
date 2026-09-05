import Subscription from "../models/subscriptionModel.js";
import BillingEvent from "../models/billingEventModel.js";
import User from "../models/userModel.js";
import { razorPayInstance } from "./razorpayService.js";
import { withAccountTransaction } from "./accountTransactionService.js";
import {
  FREE_QUOTA_BYTES,
  getQuotaForPlan,
  isKnownPlan,
} from "../config/plans.js";

export const TERMINAL_STATUSES = [
  "cancelled",
  "completed",
  "expired",
  "canceled",
  "complete",
];
const TERMINAL = new Set(TERMINAL_STATUSES);
const GRACE = new Set(["paused", "pending", "halted"]);
const PROVIDER_STATUSES = new Set([
  "created",
  "authenticated",
  "active",
  ...GRACE,
  "cancelled",
  "completed",
  "expired",
]);

export function billingError(status, message) {
  return Object.assign(new Error(message), { status });
}

export async function processedEvent(event, session = null) {
  const existing = await BillingEvent.findById(event._id)
    .session(session)
    .lean();
  if (existing && existing.payloadHash !== event.payloadHash) {
    throw billingError(409, "Webhook event ID has a different payload");
  }
  return Boolean(existing);
}

function validateSnapshot(snapshot, id) {
  if (
    !snapshot ||
    snapshot.id !== id ||
    !PROVIDER_STATUSES.has(snapshot.status) ||
    typeof snapshot.plan_id !== "string"
  ) {
    throw billingError(
      503,
      "Invalid subscription response from billing provider",
    );
  }
  if (!TERMINAL.has(snapshot.status) && !isKnownPlan(snapshot.plan_id)) {
    throw billingError(503, "Billing provider returned an unconfigured plan");
  }
}

async function refreshUserQuota(userId, session) {
  // The newest subscription that ever established access owns entitlement,
  // even after termination. Creating an unpaid checkout cannot displace it.
  // Active status supports pre-existing active records during initialization.
  const controlling = await Subscription.findOne({
    userId,
    $or: [{ hasEntitlement: true }, { status: "active" }],
  })
    .sort({ createdAt: -1, _id: -1 })
    .session(session)
    .lean();
  let quota = FREE_QUOTA_BYTES;
  if (
    controlling &&
    !TERMINAL.has(controlling.status) &&
    !["created", "authenticated"].includes(controlling.status)
  ) {
    if (!isKnownPlan(controlling.planId))
      throw billingError(
        503,
        "Controlling subscription has an unconfigured plan",
      );
    quota = getQuotaForPlan(controlling.planId);
  }
  const result = await User.updateOne(
    { _id: userId },
    { $set: { maxStorageInBytes: quota } },
    { session },
  );
  if (!result.matchedCount)
    throw billingError(503, "Billing account is not available");
}

// Webhook snapshots have no strictly monotonic version, and created_at only has
// second precision. Fetch current provider state instead of ordering snapshots
// by delivery time, timestamps or an invented status ranking.
export async function syncSubscription(razorpaySubscriptionId, event = null) {
  if (event && (await processedEvent(event))) return { duplicate: true };
  for (let attempt = 0; attempt < 4; attempt++) {
    const before = await Subscription.findOne({
      razorpaySubscriptionId,
    }).lean();
    if (!before)
      throw billingError(
        503,
        "Subscription is not registered locally yet; retry delivery",
      );
    // Bootstrap pre-change subscription histories from the provider. Local
    // terminal status alone cannot distinguish paid cancellation from an unpaid
    // checkout, so do not guess which legacy subscription owned entitlement.
    const legacy = await Subscription.find({
      userId: before.userId,
      _id: { $ne: before._id },
      hasEntitlement: { $exists: false },
    }).lean();
    const records = [before, ...legacy];
    const fetched = [];
    for (let offset = 0; offset < records.length; offset += 4) {
      const batch = await Promise.all(
        records.slice(offset, offset + 4).map(async (record) => {
          let snapshot;
          try {
            snapshot = await razorPayInstance.subscriptions.fetch(
              record.razorpaySubscriptionId,
            );
          } catch {
            throw billingError(
              503,
              "Billing provider unavailable; retry delivery",
            );
          }
          validateSnapshot(snapshot, record.razorpaySubscriptionId);
          return { before: record, snapshot };
        }),
      );
      fetched.push(...batch);
    }
    try {
      return await withAccountTransaction(
        before.userId,
        async ({ user, session }) => {
          if (event && (await processedEvent(event, session)))
            return { duplicate: true };
          let targetSubscription;
          for (const { before: captured, snapshot } of fetched) {
            const subscription = await Subscription.findOne({
              _id: captured._id,
              userId: user._id,
            }).session(session);
            if (!subscription)
              throw billingError(503, "Subscription is not available");
            // Refresh external reads too when a concurrent sync changes revision.
            if (
              subscription.billingRevision !== (captured.billingRevision || 0)
            ) {
              throw Object.assign(
                new Error("Refetch subscription after concurrent update"),
                { refetchBilling: true },
              );
            }
            const previouslyEntitled =
              subscription.hasEntitlement || subscription.status === "active";
            const wasTerminal = TERMINAL.has(subscription.status);
            const providerEstablishedAccess =
              snapshot.status === "active" ||
              ((GRACE.has(snapshot.status) || TERMINAL.has(snapshot.status)) &&
                snapshot.paid_count > 0);
            subscription.hasEntitlement =
              previouslyEntitled ||
              ((!wasTerminal || TERMINAL.has(snapshot.status)) &&
                providerEstablishedAccess);
            if (!wasTerminal) {
              subscription.status = snapshot.status;
              subscription.planId = snapshot.plan_id;
            }
            subscription.billingRevision += 1;
            subscription.lastSyncedAt = new Date();
            const isTarget = String(subscription._id) === String(before._id);
            if (isTarget && event)
              subscription.lastEventCreatedAt = Math.max(
                subscription.lastEventCreatedAt,
                event.eventCreatedAt,
              );
            await subscription.save({ session });
            if (isTarget) targetSubscription = subscription.toObject();
          }
          await refreshUserQuota(user._id, session);
          if (event)
            await BillingEvent.create([{ ...event, userId: user._id }], {
              session,
            });
          return { subscription: targetSubscription, duplicate: false };
        },
      );
    } catch (error) {
      if (error.refetchBilling) continue;
      throw error;
    }
  }
  throw billingError(
    503,
    "Subscription is changing concurrently; retry delivery",
  );
}
