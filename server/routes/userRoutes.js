import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import {
  createRateLimiter,
  emailIdentity,
} from "../middlewares/rateLimitMiddleware.js";

import {
  getUser,
  getSessions,
  loginUser,
  logoutAll,
  logoutUser,
  registerUser,
  revokeSession,
  updatePassword,
} from "../controllers/userController.js";

const router = express.Router();

const loginIpLimiter = createRateLimiter({
  name: "login:ip",
  max: 20,
  windowSeconds: 15 * 60,
});
const loginEmailLimiter = createRateLimiter({
  name: "login:email",
  max: 5,
  windowSeconds: 15 * 60,
  keyGenerator: emailIdentity,
});

router.post("/register", registerUser);

router.post("/login", loginIpLimiter, loginEmailLimiter, loginUser);

router.get("/", checkAuth, getUser);

router.get("/sessions", checkAuth, getSessions);

router.delete("/sessions/:sessionId", checkAuth, revokeSession);

router.put("/password", checkAuth, updatePassword);

router.post("/logout", logoutUser);

router.post("/logout-all", logoutAll);

export default router;
