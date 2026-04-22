import mongoose from "mongoose";

const { Schema } = mongoose;

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

    razorpaySubscriptionId: {
      type: String,
      required: true,
      unique: true,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "active", "past_due", "paused", "canceled", "in_grace"],
      default: "pending",
    },

    currentPeriodStart: Date,
    currentPeriodEnd: Date,

    cancelAtPeriodEnd: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("Subscription", subscriptionSchema);
