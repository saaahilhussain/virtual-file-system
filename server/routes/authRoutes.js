import express from "express";
import {
  createRateLimiter,
  emailIdentity,
} from "../middlewares/rateLimitMiddleware.js";
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

const loginIpLimiter = createRateLimiter({
  name: "social-login:ip",
  max: 20,
  windowSeconds: 15 * 60,
});
const otpSendIpLimiter = createRateLimiter({
  name: "otp-send:ip",
  max: 10,
  windowSeconds: 15 * 60,
});
const otpSendEmailLimiter = createRateLimiter({
  name: "otp-send:email",
  max: 3,
  windowSeconds: 15 * 60,
  keyGenerator: emailIdentity,
});
const otpVerifyIpLimiter = createRateLimiter({
  name: "otp-verify:ip",
  max: 20,
  windowSeconds: 15 * 60,
});
const otpVerifyEmailLimiter = createRateLimiter({
  name: "otp-verify:email",
  max: 5,
  windowSeconds: 15 * 60,
  keyGenerator: emailIdentity,
});
const passwordResetCompleteLimiter = createRateLimiter({
  name: "password-reset-complete:ip",
  max: 10,
  windowSeconds: 15 * 60,
});

router.post("/send-otp", otpSendIpLimiter, otpSendEmailLimiter, sendOtp);

router.post(
  "/verify-otp",
  otpVerifyIpLimiter,
  otpVerifyEmailLimiter,
  verifyOtp,
);

router.post(
  "/password-reset/request",
  otpSendIpLimiter,
  otpSendEmailLimiter,
  requestPasswordReset,
);

router.post(
  "/password-reset/verify",
  otpVerifyIpLimiter,
  otpVerifyEmailLimiter,
  verifyPasswordReset,
);

router.post(
  "/password-reset/complete",
  passwordResetCompleteLimiter,
  completePasswordReset,
);

router.post("/google", loginIpLimiter, loginWithGoogle);
router.post("/github", loginIpLimiter, loginWithGithub);

export default router;
