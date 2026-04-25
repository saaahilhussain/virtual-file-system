import { razorPayInstance } from "../services/razorpayService.js";

export const getSubscriptionDetails = (req, res) => {
  return;
};

export const createSubscription = async (req, res, err) => {
  const { planId } = req.body;
  try {
    const subscription = await razorPayInstance.subscriptions.create({
      plan_id: planId,
      total_count: 60,
      notes: {
        userId: req.user._id,
      },
    });

    

    res.json({ subscriptionId: subscription.id });
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

export const webhook = (req, res) => {
  return;
};
