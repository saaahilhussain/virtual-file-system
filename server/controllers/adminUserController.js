import User from "../models/userModel.js";
import redisClient from "../config/redis.js";
import { getUserSessionKeys } from "../services/sessionService.js";

const ROLE_RANK = {
  user: 0,
  manager: 1,
  admin: 2,
  owner: 3,
};

async function invalidateUserSessions(userId) {
  const sessionKeys = await getUserSessionKeys(userId);
  await Promise.all(sessionKeys.map((key) => redisClient.del(key)));
}

function canManageTarget(actor, target) {
  if (String(actor._id) === String(target._id)) return false;
  return ROLE_RANK[actor.role] > ROLE_RANK[target.role];
}

function managementDenied(res) {
  return res.status(403).json({
    error: "Forbidden: you cannot manage this user.",
  });
}

export const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select("-password");

    const sessionStates = await Promise.all(
      users.map(async (user) => ({
        userId: user._id.toString(),
        isLoggedIn: (await getUserSessionKeys(user._id)).length > 0,
      })),
    );
    const loggedinUsers = new Set(
      sessionStates
        .filter(({ isLoggedIn }) => isLoggedIn)
        .map(({ userId }) => userId),
    );

    const usersWithStatus = users.map((user) => ({
      ...user.toObject(),
      isLoggedIn: loggedinUsers.has(user._id.toString()),
    }));

    return res.status(200).json(usersWithStatus);
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!canManageTarget(req.user, user)) return managementDenied(res);

    user.isDeleted = true;
    await user.save();
    await invalidateUserSessions(user._id);

    const safeUser = user.toObject();
    delete safeUser.password;
    return res
      .status(200)
      .json({ message: "User deleted successfully", user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const restoreUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!canManageTarget(req.user, user)) return managementDenied(res);

    user.isDeleted = false;
    await user.save();
    const safeUser = user.toObject();
    delete safeUser.password;
    return res
      .status(200)
      .json({ message: "User restored successfully", user: safeUser });
  } catch (err) {
    next(err);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("role");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!canManageTarget(req.user, user)) return managementDenied(res);

    await invalidateUserSessions(user._id);
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

    if (!canManageTarget(req.user, targetUser)) return managementDenied(res);

    const canAssignRole =
      req.user.role === "owner" ||
      (req.user.role === "admin" && ["user", "manager"].includes(role));
    if (!canAssignRole) {
      return res.status(403).json({
        error: "Forbidden: you cannot assign this role.",
      });
    }

    targetUser.role = role;
    await targetUser.save();
    await invalidateUserSessions(targetUser._id);

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

    const targetUser = await User.findById(req.params.id).select("role");
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (!canManageTarget(req.user, targetUser)) return managementDenied(res);

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).select("-password -__v");

    return res
      .status(200)
      .json({ message: "User details updated successfully", user });
  } catch (err) {
    next(err);
  }
};
