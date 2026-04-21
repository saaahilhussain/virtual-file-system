import express from "express";
import {
  getAllUsers,
  deleteUser,
  restoreUser,
  logoutUser,
  updateRole,
  updateUser,
} from "../controllers/adminUserController.js";

const router = express.Router();

router.get("/", getAllUsers);

router.delete("/:id", deleteUser);

router.post("/logout/:id", logoutUser);
router.post("/restore/:id", restoreUser);

router.put("/role/:id", updateRole);
router.put("/update/:id", updateUser);

export default router;
