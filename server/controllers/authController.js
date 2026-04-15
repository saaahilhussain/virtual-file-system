import mongoose, { Types } from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Otp from "../models/otpModel.js";
import { verifyIdToken } from "../services/googleAuthService.js";
import { verifyGithubCode } from "../services/githubAuthService.js";
import { sendOtpService } from "../services/otpService.js";
import redisClient from "../config/redis.js";
import { z } from "zod";
import { otpSchema } from "../validators/authValidators.js";

export const sendOtp = async (req, res, next) => {
  const { success, data, error } = z
    .object({
      email: z.email("Invalid email address"),
    })
    .safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }
  const { email } = data;

  const existingEmail = await User.findOne({ email }).lean();
  if (existingEmail) {
    return res
      .status(409)
      .json({ error: "Email already exists, try a different one." });
  }
  try {
    const responseData = await sendOtpService(email);
    return res.status(200).json(responseData);
  } catch (err) {
    next(err);
  }
};

export const verifyOtp = async (req, res) => {
  const { success, data, error } = otpSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }
  const { email, otp } = data;

  const otpRecord = await Otp.findOne({ email, otp });

  if (!otpRecord) {
    return res.status(400).json({ error: "OTP is Invalid or Expired." });
  }

  await Otp.deleteOne();
  return res.status(200).json({ message: "OTP verified successfully" });
};

export const loginWithGoogle = async (req, res, next) => {
  const { idToken } = req.body;
  const { name, email, picture } = await verifyIdToken(idToken);

  const user = await User.findOne({ email });

  if (user) {
    if (!user.picture.includes("googleusercontent.com")) {
      user.picture = picture;
      await user.save();
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
    const sessionExpiry = 1000 * 60 * 60 * 24 * 7;
    await redisClient.json.set(redisKey, "$", {
      userId: user._id,
      rootDirId: user.rootDirId,
    });
    await redisClient.expire(redisKey, sessionExpiry / 1000);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      maxAge: sessionExpiry,
    });
    return res.status(200).json({ message: "logged in" });
  }

  const mongooseSession = await mongoose.startSession();

  try {
    const rootDirId = new Types.ObjectId();
    const userId = new Types.ObjectId();

    mongooseSession.startTransaction();
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
      { mongooseSession },
    );

    await User.create(
      [
        {
          _id: userId,
          name,
          email,

          rootDirId,
          role: "user",
          isDeleted: false,
        },
      ],
      { mongooseSession },
    );

    mongooseSession.commitTransaction();

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
    const sessionExpiry = 60 * 60 * 24 * 7 * 1000;
    await redisClient.json.set(redisKey, "$", { userId, rootDirId });
    await redisClient.expire(redisKey, sessionExpiry / 1000);

    res.cookie("sid", sessionId, {
      httpOnly: true,
      signed: true,
      maxAge: sessionExpiry,
    });

    return res.status(201).json({ message: "User Registered and logged in." });
  } catch (err) {
    mongooseSession.abortTransaction();
    next(err);
  }
};

export const loginWithGithub = async (req, res, next) => {
  const { code } = req.body;

  try {
    const { name, email, picture } = await verifyGithubCode(code);

    const user = await User.findOne({ email });

    if (user) {
      if (
        !user.picture.includes("githubusercontent.com") &&
        !user.picture.includes("googleusercontent.com")
      ) {
        user.picture = picture;
        await user.save();
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
      const sessionExpiry = 1000 * 60 * 60 * 24 * 7;
      await redisClient.json.set(redisKey, "$", {
        userId: user._id,
        rootDirId: user.rootDirId,
      });
      await redisClient.expire(redisKey, sessionExpiry / 1000);

      res.cookie("sid", sessionId, {
        httpOnly: true,
        signed: true,
        maxAge: sessionExpiry,
      });
      return res.status(200).json({ message: "logged in" });
    }

    const mongooseSession = await mongoose.startSession();

    try {
      const rootDirId = new Types.ObjectId();
      const userId = new Types.ObjectId();

      mongooseSession.startTransaction();
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
        { mongooseSession },
      );
      await User.create(
        [
          {
            _id: userId,
            name,
            email,
            rootDirId,
            role: "user",
            isDeleted: false,
          },
        ],
        { mongooseSession },
      );

      mongooseSession.commitTransaction();

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
      const sessionExpiry = 60 * 60 * 24 * 7 * 1000;
      await redisClient.json.set(redisKey, "$", { userId, rootDirId });
      await redisClient.expire(redisKey, sessionExpiry / 1000);

      res.cookie("sid", sessionId, {
        httpOnly: true,
        signed: true,
        maxAge: sessionExpiry,
      });

      return res
        .status(201)
        .json({ message: "User Registered and logged in." });
    } catch (err) {
      mongooseSession.abortTransaction();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
