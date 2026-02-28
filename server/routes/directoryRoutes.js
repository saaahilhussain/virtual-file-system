import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

import {
  createDirectory,
  getDirectory,
  renameDirectory,
  trashDirectory,
  restoreDirectory,
  permanentlyDeleteDirectory,
} from "../controllers/directoryController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

// Read
router.get("/:id?", getDirectory);

router.post("/:parentDirId?", createDirectory);

router.patch("/:id", renameDirectory);

router.delete("/:id", trashDirectory);
router.delete("/:id/permanent", permanentlyDeleteDirectory);
router.patch("/:id/restore", restoreDirectory);

export default router;
