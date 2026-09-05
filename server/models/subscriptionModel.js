import mongoose from "mongoose";

const { Schema, model } = mongoose;

const subscriptionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
    },
    // email: {
    //   type: String,
    //   match: [
    //     /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+.[A-Za-z]{2,}$/,
    //     "Please enter a valid email",
    //   ],
    //   minLength: 4,
    //   required: true,
    // },

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    // billingCycle: {
    //   type: String,
    //   enum: ["monthly", "yearly"],
    //   required: true,
    // },

    status: {
      type: String,
      enum: [
        "created",
        "authenticated",
        "active",
        "pending",
        "halted",
        "paused",
        "cancelled",
        "completed",
        "expired",
        // Legacy values retained so existing records remain readable.
        "past_due",
        "canceled",
        "in_grace",
        "complete",
      ],
      default: "created",
    },
    billingRevision: { type: Number, default: 0 },
    // Retained after cancellation: an older subscription must never regain
    // control of quota after a newer paid subscription ends.
    hasEntitlement: { type: Boolean, default: false },
    lastEventCreatedAt: { type: Number, default: 0 },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

subscriptionSchema.index({ userId: 1, createdAt: -1, _id: -1 });

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
