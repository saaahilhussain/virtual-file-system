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

  const allSessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${user.id}}`,
    {
      RETURN: [],
    },
  );

  if (allSessions.total >= 2) {
    await redisClient.del(allSessions.documents[0].id);
  }

  const sessionId = crypto.randomUUID();
  const redisKey = `session:${sessionId}`;
  const sessionExpiry = 60 * 60 * 24 * 1000;
  await redisClient.json.set(redisKey, "$", {
    userId: user._id,
    rootDirId: user.rootDirId,
    role: user.role,
  });
  await redisClient.expire(redisKey, sessionExpiry / 1000);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    signed: true,
    maxAge: sessionExpiry,
    secure: isProd,
    sameSite: "lax",
  });
  return res.status(200).json({ message: "logged in" });
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  const rootDirectory = await Directory.findOne(
    { _id: req.user.rootDirId, userId: req.user._id },
    { size: 1 },
  ).lean();

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
  const { sid } = req.signedCookies;
  const session = await redisClient.json.get(`session:${sid}`);

  await redisClient.del(`session:${sid}`);

  res.clearCookie("sid");
  res.status(204).end();
};
