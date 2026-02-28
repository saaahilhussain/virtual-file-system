import express from "express";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

import {
  // deleteFile,
  getFile,
  renameFile,
  uploadFile,
  trashFile,
  restoreFile,
  permanentlyDeleteFile,
} from "../controllers/fileController.js";

const router = express.Router();

router.param("parentDirId", validateIdMiddleware);
router.param("id", validateIdMiddleware);

router.post("/:parentDirId?", uploadFile);

router.get("/:id", getFile);

router.patch("/:id", renameFile);

router.delete("/:id", trashFile);
router.delete("/:id/permanent", permanentlyDeleteFile);
router.patch("/:id/restore", restoreFile);

export default router;
