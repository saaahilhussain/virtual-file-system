import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";

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

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/", checkAuth, getUser);

router.get("/sessions", checkAuth, getSessions);

router.delete("/sessions/:sessionId", checkAuth, revokeSession);

router.put("/password", checkAuth, updatePassword);

router.post("/logout", logoutUser);

router.post("/logout-all", logoutAll);

export default router;
