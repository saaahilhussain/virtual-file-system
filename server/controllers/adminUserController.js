import User from "../models/userModel.js";
import Session from "../models/sessionModel.js";

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password");
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: true },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Force logout the deleted user
    await Session.deleteMany({ userId: user._id });

    return res.status(200).json({ message: "User deleted successfully", user });
  } catch (err) {
    next(err);
  }
};

export const restoreUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isDeleted: false },
      { new: true },
    ).select("-password");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "User restored successfully", user });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    await Session.deleteMany({ userId: req.params.id });
    return res
      .status(200)
      .json({ message: "User forcefully logged out of all sessions" });
  } catch (err) {
    next(err);
  }
};

export const updateRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["user", "manager", "admin", "owner"];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role specified." });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Logic Constraint: Prevent elevating to admin/owner without appropriate authority
    if ((role === "admin" || role === "owner") && req.user.role !== "owner") {
      return res.status(403).json({
        error: "Forbidden: Only the owner can assign the Admin or Owner role.",
      });
    }

    // Check if a non-owner is trying to modify an owner's role
    if (targetUser.role === "owner" && req.user.role !== "owner") {
      return res
        .status(403)
        .json({ error: "Forbidden: Cannot modify the role of an owner." });
    }

    targetUser.role = role;
    await targetUser.save();

    return res.status(200).json({
      message: "User role updated successfully",
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const { name, email, picture } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (picture) updateData.picture = picture;

    // Reject updates to sensitive fields
    if (
      req.body.password ||
      req.body.role ||
      req.body.isDeleted ||
      req.body.rootDirId
    ) {
      return res
        .status(400)
        .json({ error: "Cannot update sensitive fields via this endpoint." });
    }

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res
      .status(200)
      .json({ message: "User details updated successfully", user });
  } catch (err) {
    next(err);
  }
};
