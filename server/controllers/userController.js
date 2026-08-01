import mongoose, { Types } from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import redisClient from "../config/redis.js";
import {
  registerSchema,
  loginSchema,
  passwordUpdateSchema,
} from "../validators/authValidators.js";
import { z } from "zod";
import { createSession, getUserSessionKeys } from "../services/sessionService.js";

const isProd = process.env.NODE_ENV === "production";

function getEffectiveAuthProviders(user) {
  const providers = new Set(
    Array.isArray(user.authProviders) ? user.authProviders : [],
  );

  if (!providers.size && user.password) {
    providers.add("local");
  }

  if (!providers.size && !user.password) {
    if (typeof user.picture === "string") {
      if (user.picture.includes("googleusercontent.com")) {
        providers.add("google");
      } else if (user.picture.includes("githubusercontent.com")) {
        providers.add("github");
      }
    }
  }

  return [...providers];
}

export const registerUser = async (req, res, next) => {
  const { success, data, error } = registerSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }
  const { name, email, password } = data;

  const foundUser = await User.findOne({ email });
  if (foundUser) {
    return res.status(409).json({
      error: "User already exists",
      message:
        "A user with this email address already exists. Please try logging in or use a different email.",
    });
  }

  const session = await mongoose.startSession();

  try {
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    session.startTransaction();
    await Directory.create(
      [
        {
          _id: rootDirId,
          name: `root-${email}`,
          parentDirId: null,
          path: [rootDirId],
          userId,
        },
      ],
      { session },
    );

    await User.create(
      [
        {
          _id: userId,
          name,
          email,
          password,
          authProviders: ["local"],
          rootDirId,
          role: "user",
          isDeleted: false,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    return res.status(201).json({ message: "User Registered" });
  } catch (err) {
    await session.abortTransaction();
    if (err.code === 121) {
      res
        .status(400)
        .json({ error: "Invalid input, please enter valid details" });
    } else {
      next(err);
    }
  }
};

export const loginUser = async (req, res, next) => {
  const { success, data, error } = loginSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: "Invalid Credentials" });
  }
  const { email, password } = data;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }

  if (user.isDeleted) {
    return res.status(403).json({
      error: "Account deactivated",
      message:
        "Your account has been deactivated. Please contact the administrator for assistance.",
    });
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }

  const sessionExpiry = 60 * 60 * 24 * 1000;
  await createSession({ res, req, user, sessionExpiry, isProd });
  return res.status(200).json({ message: "logged in" });
};

export const getUser = async (req, res) => {
  const [user, rootDirectory] = await Promise.all([
    User.findById(req.user._id)
      .select("name email picture authProviders password maxStorageInBytes role")
      .lean(),
    Directory.findOne(
      { _id: req.user.rootDirId, userId: req.user._id },
      { size: 1 },
    ).lean(),
  ]);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({
    name: user.name,
    email: user.email,
    picture: user.picture,
    authProviders: getEffectiveAuthProviders(user),
    hasPassword: Boolean(user.password),
    usedStorage: rootDirectory?.size || 0,
    maxStorage: user.maxStorageInBytes,
    role: user.role,
  });
};

export const updatePassword = async (req, res) => {
  const { success, data, error } = passwordUpdateSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }

  const { currentPassword, newPassword } = data;
  const user = await User.findById(req.user._id);

  if (!user || user.isDeleted) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.password) {
    if (!currentPassword) {
      return res
        .status(400)
        .json({
          error: "Current password is required to change your password.",
        });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect." });
    }
  }

  user.password = newPassword;

  const providers = new Set(getEffectiveAuthProviders(user));
  providers.add("local");
  user.authProviders = [...providers];

  await user.save();

  return res.status(200).json({
    message: "Password updated successfully.",
    hasPassword: true,
    authProviders: user.authProviders,
  });
};

export const logoutUser = async (req, res) => {
  const { sid } = req.signedCookies;
  await redisClient.del(`session:${sid}`);
  res.clearCookie("sid");
  res.status(204).end();
};

export const logoutAll = async (req, res) => {
  const sessionKeys = await getUserSessionKeys(req.user._id);
  await Promise.all(sessionKeys.map((key) => redisClient.del(key)));

  res.clearCookie("sid");
  res.status(204).end();
};

export const getSessions = async (req, res, next) => {
  try {
    const { sid } = req.signedCookies;
    const sessionKeys = await getUserSessionKeys(req.user._id);
    const sessions = await Promise.all(
      sessionKeys.map(async (key) => {
        const session = await redisClient.json.get(key);
        return {
          id: key.replace("session:", ""),
          device: session?.device || "Unknown device",
          createdAt: session?.createdAt || null,
          lastActiveAt: session?.lastActiveAt || null,
          isCurrent: key === `session:${sid}`,
        };
      }),
    );

    sessions.sort(
      (left, right) =>
        Number(right.isCurrent) - Number(left.isCurrent) ||
        new Date(right.lastActiveAt || 0) - new Date(left.lastActiveAt || 0),
    );
    return res.status(200).json({ sessions });
  } catch (error) {
    next(error);
  }
};

export const revokeSession = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const { sid } = req.signedCookies;
    if (sessionId === sid) {
      return res.status(400).json({ error: "Use logout to sign out of this device." });
    }

    const sessionKey = `session:${sessionId}`;
    const session = await redisClient.json.get(sessionKey);
    if (!session || session.userId !== req.user._id.toString()) {
      return res.status(404).json({ error: "Session not found." });
    }

    await redisClient.del(sessionKey);
    return res.status(204).end();
  } catch (error) {
    next(error);
  }
};
