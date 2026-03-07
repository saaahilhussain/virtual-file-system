import express from "express";
import checkAuth from "../middlewares/authMiddleware.js";
import { getAllUsers, deleteUser, restoreUser, logoutUser, updateRole, updateUser } from "../controllers/adminUserController.js";
    
const router = express.Router();

router.get("/", checkAuth, getAllUsers);

router.delete("/:id", checkAuth, deleteUser);

router.post("/logout/:id", checkAuth, logoutUser);
router.post("/restore/:id", checkAuth, restoreUser);

router.put("/role/:id", checkAuth, updateRole);
router.put("/update/:id", checkAuth, updateUser);

export default router;
