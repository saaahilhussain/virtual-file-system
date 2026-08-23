import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import { optionalAuth } from "../middlewares/authMiddleware.js";
import { createRateLimiter } from "../middlewares/rateLimitMiddleware.js";
import {
  getSharedItem,
  downloadSharedFile,
} from "../controllers/publicShareController.js";

const router = express.Router();

router.param("fileId", validateIdMiddleware);

const publicShareLimiter = createRateLimiter({
  name: "public-share:ip",
  max: 60,
  windowSeconds: 15 * 60,
});

router.get("/:token", optionalAuth, publicShareLimiter, getSharedItem);
router.get(
  "/:token/download/:fileId",
  optionalAuth,
  publicShareLimiter,
  downloadSharedFile,
);

export default router;
