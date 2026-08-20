import express from "express";
import {
  createRateLimiter,
  userIdentity,
} from "../middlewares/rateLimitMiddleware.js";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionBillingDetails,
  getSubscriptionDetails,
  pauseSubscription,
  resumeSubscription,
  upgradeSubscription,
} from "../controllers/subscriptionController.js";

const router = express.Router();

const subscriptionLimiter = createRateLimiter({
  name: "subscription:user",
  max: 60,
  windowSeconds: 60,
  keyGenerator: userIdentity,
});
const subscriptionMutationLimiter = createRateLimiter({
  name: "subscription-mutation:user",
  max: 10,
  windowSeconds: 15 * 60,
  keyGenerator: userIdentity,
});

router.use(subscriptionLimiter);

router.get("/my-plan", getSubscriptionDetails);
router.get("/my-plan/details", getSubscriptionBillingDetails);
router.post("/create", subscriptionMutationLimiter, createSubscription);
router.post("/upgrade", subscriptionMutationLimiter, upgradeSubscription);
router.post("/pause", subscriptionMutationLimiter, pauseSubscription);
router.post("/resume", subscriptionMutationLimiter, resumeSubscription);
router.post("/cancel", subscriptionMutationLimiter, cancelSubscription);

export default router;
