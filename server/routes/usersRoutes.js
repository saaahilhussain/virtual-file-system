import express from "express";
import {
  getAllUsers,
  deleteUser,
  restoreUser,
  logoutUser,
  updateRole,
  updateUser,
} from "../controllers/adminUserController.js";
import {
  requireAnyPermissionMiddleware,
  requirePermissionMiddleware,
} from "../middlewares/authMiddleware.js";
import validateIdMiddleware from "../middlewares/validateIdMiddleware.js";

const router = express.Router();
router.param("id", validateIdMiddleware);

router.get("/", requirePermissionMiddleware("user:view"), getAllUsers);

router.delete(
  "/:id",
  requirePermissionMiddleware("user:soft_delete"),
  deleteUser,
);

router.post(
  "/logout/:id",
  requirePermissionMiddleware("user:logout"),
  logoutUser,
);
router.post(
  "/restore/:id",
  requirePermissionMiddleware("user:restore"),
  restoreUser,
);

router.put(
  "/role/:id",
  requireAnyPermissionMiddleware("role:assign:any", "role:assign:limited"),
  updateRole,
);
router.put(
  "/update/:id",
  requirePermissionMiddleware("user:update"),
  updateUser,
);

export default router;
