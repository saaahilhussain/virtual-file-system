import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

import {
  createDirectory,
  getDirectory,
  renameDirectory,deleteDirectory
} from "../controllers/directoryController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

// Read
router.get("/:id?", getDirectory);

router.post("/:parentDirId?", createDirectory);

router.patch("/:id", renameDirectory);

router.delete("/:id", deleteDirectory);

export default router;
