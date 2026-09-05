import crypto from "crypto";
import Razorpay from "razorpay";
import { syncSubscription, billingError } from "../services/billingService.js";

const EVENTS = new Set([
  "subscription.created",
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.updated",
  "subscription.pending",
  "subscription.halted",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.expired",
]);

export const webhookController = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    if (typeof signature !== "string" || !Buffer.isBuffer(req.body)) {
      throw billingError(400, "Invalid webhook request");
    }
    const rawBody = req.body.toString("utf8");
    if (
      !Razorpay.validateWebhookSignature(
        rawBody,
        signature,
        process.env.WEBHOOK_SECRET,
      )
    ) {
      throw billingError(400, "Invalid Signature");
    }
    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      throw billingError(400, "Malformed webhook JSON");
    }
    if (!payload || typeof payload.event !== "string")
      throw billingError(400, "Invalid webhook event");
    if (!EVENTS.has(payload.event))
      return res.json({ received: true, ignored: true });

    const eventId = req.headers["x-razorpay-event-id"];
    const subscriptionId = payload.payload?.subscription?.entity?.id;
    if (
      typeof eventId !== "string" ||
      !eventId.trim() ||
      eventId.length > 200 ||
      typeof subscriptionId !== "string" ||
      !subscriptionId.startsWith("sub_") ||
      subscriptionId.length > 200 ||
      !Number.isSafeInteger(payload.created_at) ||
      payload.created_at <= 0
    ) {
      throw billingError(
        400,
        "Missing or invalid webhook event ID, subscription ID or timestamp",
      );
    }

    const result = await syncSubscription(subscriptionId, {
      _id: eventId,
      payloadHash: crypto.createHash("sha256").update(req.body).digest("hex"),
      eventType: payload.event,
      razorpaySubscriptionId: subscriptionId,
      eventCreatedAt: payload.created_at,
    });
    return res.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error.status) {
      if (error.status === 503) res.set("Retry-After", "30");
      return res.status(error.status).json({ error: error.message });
    }
    return next(error);
  }
};
