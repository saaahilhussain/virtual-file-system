import express from "express";
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

router.get("/my-plan", getSubscriptionDetails);
router.get("/my-plan/details", getSubscriptionBillingDetails);
router.post("/create", createSubscription);
router.post("/upgrade", upgradeSubscription);
router.post("/pause", pauseSubscription);
router.post("/resume", resumeSubscription);
router.post("/cancel", cancelSubscription);

export default router;
