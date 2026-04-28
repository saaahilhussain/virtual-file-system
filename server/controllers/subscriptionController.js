import { razorPayInstance } from "../services/razorpayService.js";
import Subscription from "../models/subscriptionModel.js";

export const getSubscriptionDetails = (req, res) => {
  return;
};

export const createSubscription = async (req, res, next) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "planId is required" });
  }

  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const rzpSubscription = await razorPayInstance.subscriptions.create({
      plan_id: planId,
      total_count: 60,
      notes: {
        userId: req.user._id,
      },
    });

    const subscription = new Subscription({
      userId: req.user._id,
      planId,
      razorpaySubscriptionId: rzpSubscription.id,
    });

    await subscription.save();

    res.json({ subscriptionId: rzpSubscription.id });
  } catch (error) {
    next(error);
  }
};

export const upgradeSubscription = (req, res) => {
  return;
};

export const pauseSubscription = (req, res) => {
  return;
};

export const cancelSubscription = (req, res) => {
  return;
};
