import express from "express";
import {
  cancelSubscription,
  createSubscription,
  getSubscriptionDetails,
  pauseSubscription,
  upgradeSubscription,
  webhook,
} from "../controllers/subscriptionController.js";

const router = express.Router();

router.get("/my-plan", getSubscriptionDetails);

router.post("/create", createSubscription);

router.post("/upgrade", upgradeSubscription);

router.post("/pause", pauseSubscription);

router.post("/cancel", cancelSubscription);

router.post("/api/billing/webhook", webhook);

export default router;
