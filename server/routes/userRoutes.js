import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";

import {
  getUser,
  loginUser,
  logoutAll,
  logoutUser,
  registerUser,
} from "../controllers/userController.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/", checkAuth, getUser);

router.post("/logout", logoutUser);

router.post("/logout-all", logoutAll);

export default router;
