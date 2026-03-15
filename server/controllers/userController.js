import mongoose, { Types } from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import redisClient from "../config/redis.js";

export const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;

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
          rootDirId,
          role: "user",
          isDeleted: false,
        },
      ],
      { session },
    );

    session.commitTransaction();
    return res.status(201).json({ message: "User Registered" });
  } catch (err) {
    if (err.code === 121) {
      session.abortTransaction();
      res
        .status(400)
        .json({ error: "Invalid input, please enter valid details" });
    } else {
      next(err);
    }
  }
};

export const loginUser = async (req, res, next) => {
  const { email, password } = req.body;

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

  const sessionId = crypto.randomUUID();
  const redisKey = `session:${sessionId}`;
  const sessionExpiry = 60 * 60 * 24 * 1000;
  await redisClient.json.set(redisKey, "$", {
    userId: user._id,
    rootDirId: user.rootDirId,
  });
  await redisClient.expire(redisKey, sessionExpiry / 1000);

  res.cookie("sid", sessionId, {
    signed: true,
    maxAge: sessionExpiry,
  });
  return res.status(200).json({ message: "logged in" });
};

export const getUser = async (req, res) => {
  const user = await User.findById(req.user._id);
  return res.status(200).json({
    name: user.name,
    email: user.email,
    picture: user.picture,
    role: user.role,
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
