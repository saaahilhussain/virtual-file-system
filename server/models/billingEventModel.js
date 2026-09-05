import { Schema, model } from "mongoose";

const schema = new Schema(
  {
    _id: { type: String, required: true }, // x-razorpay-event-id
    payloadHash: { type: String, required: true },
    eventType: { type: String, required: true },
    razorpaySubscriptionId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    eventCreatedAt: { type: Number, required: true },
    processedAt: { type: Date, default: Date.now },
  },
  { strict: "throw" },
);
// No TTL: an old replay must remain deduplicated.
schema.index({ razorpaySubscriptionId: 1, processedAt: -1 });
export default model("BillingEvent", schema);
