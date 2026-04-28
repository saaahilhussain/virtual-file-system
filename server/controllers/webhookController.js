import Razorpay from "razorpay";
import Subscription from "../models/subscriptionModel.js";
import User from "../models/userModel.js";
// const LIVE_PLANS = {
//     //
// }

const TEST_PLANS = {
  plan_ShjMpfAfF4O0rO: {
    maxStorageQuotaInBytes: 200 * 1024 ** 3, // 200 gb/M
  },
  plan_Shj6gp1ZIwVX9R: {
    maxStorageQuotaInBytes: 200 * 1024 ** 3, // 200 gb/Y
  },

  plan_Shj6H9v3zxpCqu: {
    maxStorageQuotaInBytes: 2 * 1024 ** 4, // 2 tb/M
  },
  plan_Shj5cTO35vELF8: {
    maxStorageQuotaInBytes: 2 * 1024 ** 4, // 2 tb/Y
  },
};

export const webhookController = async (req, res, next) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const isSignatureValid = Razorpay.validateWebhookSignature(
      JSON.stringify(req.body),
      signature,
      process.env.WEBHOOK_SECRET,
    );

    if (isSignatureValid) {
      if (req.body.event === "subscription.charged") {
        const rzpSubscription = req.body.payload.subscription.entity;
        const planId = rzpSubscription.plan_id;
        // 1. Update subscription status from "created" to --> "active"

        const subscription = await Subscription.findOne({
          razorpaySubscriptionId: rzpSubscription.id,
        });

        subscription.status = rzpSubscription.status;
        await subscription.save();

        // 2. Increase storage quota for user
        const purchasedStorageQuota = TEST_PLANS[planId].maxStorageQuotaInBytes;

        const user = await User.findById(subscription.userId);
        user.maxStorageInBytes = purchasedStorageQuota;
        await user.save();

        return res.json({ message: "OK" });
      }
    } else {
      return res.status(400).json({ error: "Invalid Signature" });
    }
  } catch (error) {
    next(error);
  }
};
