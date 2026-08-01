import express from "express";
import {
  loginWithGoogle,
  loginWithGithub,
  sendOtp,
  verifyOtp,
  requestPasswordReset,
  verifyPasswordReset,
  completePasswordReset,
} from "../controllers/authController.js";

const router = express.Router();

router.post("/send-otp", sendOtp);

router.post("/verify-otp", verifyOtp);

router.post("/password-reset/request", requestPasswordReset);

router.post("/password-reset/verify", verifyPasswordReset);

router.post("/password-reset/complete", completePasswordReset);

router.post("/google", loginWithGoogle);

router.post("/github", loginWithGithub);

export default router;
