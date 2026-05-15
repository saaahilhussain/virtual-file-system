import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
import { FREE_QUOTA_BYTES, getQuotaForPlan } from "../config/plans.js";

const findSubscription = (rzpId) =>
  Subscription.findOne({ razorpaySubscriptionId: rzpId });

const setUserQuota = async (userId, bytes) => {
  const user = await User.findById(userId);
  if (!user) return;
  user.maxStorageInBytes = bytes;
  await user.save();
};

export const webhookController = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const isSignatureValid = Razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.WEBHOOK_SECRET,
    );

    if (!isSignatureValid) {
      return res.status(400).json({ error: "Invalid Signature" });
    }

    const event = req.body.event;
    const rzpSubscription = req.body.payload?.subscription?.entity;

    if (!rzpSubscription) {
      return res.json({ received: true });
    }

    const subscription = await findSubscription(rzpSubscription.id);
    if (!subscription) {
      return res.json({ received: true });
    }

    switch (event) {
      case "subscription.charged": {
        subscription.status = rzpSubscription.status;
        subscription.planId = rzpSubscription.plan_id;
        await subscription.save();
        await setUserQuota(
          subscription.userId,
          getQuotaForPlan(rzpSubscription.plan_id),
        );
        break;
      }

      case "subscription.updated": {
        subscription.status = rzpSubscription.status;
        subscription.planId = rzpSubscription.plan_id;
        await subscription.save();
        await setUserQuota(
          subscription.userId,
          getQuotaForPlan(rzpSubscription.plan_id),
        );
        break;
      }

      case "subscription.cancelled":
      case "subscription.completed": {
        subscription.status = rzpSubscription.status;
        await subscription.save();
        await setUserQuota(subscription.userId, FREE_QUOTA_BYTES);
        break;
      }

      case "subscription.paused":
      case "subscription.resumed":
      case "subscription.halted": {
        subscription.status = rzpSubscription.status;
        await subscription.save();
        break;
      }

      default:
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    next(error);
  }
};
