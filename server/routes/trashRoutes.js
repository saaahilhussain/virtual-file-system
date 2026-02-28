import express from "express";
import { getTrash, emptyTrash } from "../controllers/trashController.js";

const router = express.Router();

router.get("/", getTrash);
router.delete("/", emptyTrash);

export default router;
