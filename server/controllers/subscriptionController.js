import { razorPayInstance } from "../services/razorpayService.js";
import Subscription from "../models/subscriptionModel.js";

const ACTIVE_STATUSES = { $nin: ["canceled", "complete"] };

const findActiveSubscription = (userId) =>
  Subscription.findOne({ userId, status: ACTIVE_STATUSES }).sort({
    createdAt: -1,
  });

export const getSubscriptionDetails = async (req, res, next) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await findActiveSubscription(req.user._id);
    if (!subscription) {
      return res.json({ subscription: null });
    }

    const rzpSubscription = await razorPayInstance.subscriptions.fetch(
      subscription.razorpaySubscriptionId,
    );

    return res.json({
      subscription: {
        _id: subscription._id,
        planId: subscription.planId,
        status: subscription.status,
        razorpaySubscriptionId: subscription.razorpaySubscriptionId,
        createdAt: subscription.createdAt,
        currentStart: rzpSubscription.current_start,
        currentEnd: rzpSubscription.current_end,
        chargeAt: rzpSubscription.charge_at,
        paidCount: rzpSubscription.paid_count,
        totalCount: rzpSubscription.total_count,
        remainingCount: rzpSubscription.remaining_count,
      },
    });
  } catch (error) {
    next(error);
  }
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

export const upgradeSubscription = async (req, res, next) => {
  const { planId } = req.body;

  if (!planId) {
    return res.status(400).json({ error: "planId is required" });
  }

  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await findActiveSubscription(req.user._id);
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    if (subscription.planId === planId) {
      return res
        .status(400)
        .json({ error: "Already subscribed to this plan" });
    }

    await razorPayInstance.subscriptions.update(
      subscription.razorpaySubscriptionId,
      {
        plan_id: planId,
        schedule_change_at: "cycle_end",
      },
    );

    subscription.planId = planId;
    await subscription.save();

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const pauseSubscription = async (req, res, next) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await findActiveSubscription(req.user._id);
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const rzpResp = await razorPayInstance.subscriptions.pause(
      subscription.razorpaySubscriptionId,
      { pause_at: "now" },
    );

    subscription.status = rzpResp.status;
    await subscription.save();

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const resumeSubscription = async (req, res, next) => {
  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await findActiveSubscription(req.user._id);
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const rzpResp = await razorPayInstance.subscriptions.resume(
      subscription.razorpaySubscriptionId,
      { resume_at: "now" },
    );

    subscription.status = rzpResp.status;
    await subscription.save();

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};

export const cancelSubscription = async (req, res, next) => {
  const cancelAtCycleEnd = req.body?.cancelAtCycleEnd !== false;

  if (!req.user?._id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const subscription = await findActiveSubscription(req.user._id);
    if (!subscription) {
      return res.status(404).json({ error: "No active subscription found" });
    }

    const rzpResp = await razorPayInstance.subscriptions.cancel(
      subscription.razorpaySubscriptionId,
      cancelAtCycleEnd,
    );

    subscription.status = rzpResp.status;
    await subscription.save();

    res.json({ subscription });
  } catch (error) {
    next(error);
  }
};
