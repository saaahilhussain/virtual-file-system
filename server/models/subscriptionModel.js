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
        "active",
        "past_due",
        "paused",
        "canceled",
        "in_grace",
        "complete",
      ],
      default: "created",
    },
  },
  { timestamps: true },
);

const Subscription = model("Subscription", subscriptionSchema);

export default Subscription;
