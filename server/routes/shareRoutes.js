import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";
import {
  createShare,
  updateShare,
  revokeShare,
} from "../controllers/shareController.js";

const router = express.Router();

router.param("id", validateIdMiddleware);

router.post("/", createShare);
router.patch("/:id", updateShare);
router.delete("/:id", revokeShare);

export default router;
