import mongoose, { Types } from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import { verifyIdToken } from "../services/googleAuthService.js";
import { verifyGithubCode } from "../services/githubAuthService.js";
import { sendOtpService, verifyOtpService } from "../services/otpService.js";
import redisClient from "../config/redis.js";
import { z } from "zod";
import crypto from "crypto";
import {
  otpSchema,
  passwordResetCompleteSchema,
  passwordResetRequestSchema,
} from "../validators/authValidators.js";

const isProd = process.env.NODE_ENV === "production";
const SOCIAL_PROVIDERS = new Set(["google", "github"]);
const RESET_GRANT_TTL_SECONDS = 10 * 60;
const RESET_REQUEST_MESSAGE =
  "If an eligible account exists for that email, a reset code has been sent.";

function resetGrantKey(token) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return `password-reset:${tokenHash}`;
}

async function invalidateUserSessions(userId) {
  const allSessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${userId}}`,
    { RETURN: [] },
  );

  await Promise.all(
    allSessions.documents.map((session) => redisClient.del(session.id)),
  );
}

function getEffectiveAuthProviders(user) {
  const providers = new Set(
    Array.isArray(user.authProviders) ? user.authProviders : [],
  );

  if (!providers.size && user.password) {
    providers.add("local");
  }

  return providers;
}

function ensureAuthProvider(user, provider) {
  if (!SOCIAL_PROVIDERS.has(provider)) return false;

  const providers = getEffectiveAuthProviders(user);
  if (providers.has(provider)) return false;

  providers.add(provider);
  user.authProviders = [...providers];
  return true;
}

async function createSession(res, user, sessionExpiry) {
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
}

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

  const verified = await verifyOtpService(email, otp, "registration");
  if (!verified) {
    return res.status(400).json({ error: "OTP is Invalid or Expired." });
  }

  return res.status(200).json({ message: "OTP verified successfully" });
};

export const requestPasswordReset = async (req, res, next) => {
  const { success, data } = passwordResetRequestSchema.safeParse(req.body);
  if (!success) {
    return res.status(200).json({ message: RESET_REQUEST_MESSAGE });
  }

  try {
    const user = await User.findOne({ email: data.email })
      .select("_id isDeleted")
      .lean();

    if (user && !user.isDeleted) {
      await sendOtpService(data.email, "password_reset");
    }

    return res.status(200).json({ message: RESET_REQUEST_MESSAGE });
  } catch (err) {
    console.error("Password reset request failed", err);
    return res.status(200).json({ message: RESET_REQUEST_MESSAGE });
  }
};

export const verifyPasswordReset = async (req, res, next) => {
  const { success, data, error } = otpSchema.safeParse(req.body);
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }

  try {
    const user = await User.findOne({ email: data.email })
      .select("_id isDeleted")
      .lean();
    const verified =
      Boolean(user && !user.isDeleted) &&
      (await verifyOtpService(data.email, data.otp, "password_reset"));

    if (!verified) {
      return res.status(400).json({ error: "OTP is invalid or expired." });
    }

    const resetToken = crypto.randomUUID();
    await redisClient.set(resetGrantKey(resetToken), data.email, {
      EX: RESET_GRANT_TTL_SECONDS,
    });

    return res.status(200).json({
      message: "OTP verified successfully.",
      resetToken,
    });
  } catch (err) {
    next(err);
  }
};

export const completePasswordReset = async (req, res, next) => {
  const { success, data, error } = passwordResetCompleteSchema.safeParse(
    req.body,
  );
  if (!success) {
    return res.status(400).json({ error: z.flattenError(error).fieldErrors });
  }

  try {
    const grantEmail = await redisClient.sendCommand([
      "GETDEL",
      resetGrantKey(data.resetToken),
    ]);
    if (grantEmail !== data.email) {
      return res.status(400).json({ error: "Reset session is invalid or expired." });
    }

    const user = await User.findOne({ email: data.email });
    if (!user || user.isDeleted) {
      return res.status(400).json({ error: "Reset session is invalid or expired." });
    }

    user.password = data.newPassword;
    const providers = new Set(getEffectiveAuthProviders(user));
    providers.add("local");
    user.authProviders = [...providers];
    await user.save();

    await invalidateUserSessions(user.id);
    res.clearCookie("sid");
    return res.status(200).json({
      message: "Password reset successfully. Please sign in with your new password.",
    });
  } catch (err) {
    next(err);
  }
};

export const loginWithGoogle = async (req, res, next) => {
  const { idToken } = req.body;
  const { name, email, picture } = await verifyIdToken(idToken);

  const user = await User.findOne({ email });

  if (user) {
    const shouldSaveUser =
      ensureAuthProvider(user, "google") ||
      (!user.picture.includes("googleusercontent.com") &&
        !user.picture.includes("githubusercontent.com") &&
        user.picture !== picture);

    if (!user.picture.includes("googleusercontent.com")) {
      user.picture = picture;
    }
    if (shouldSaveUser) {
      await user.save();
    }

    const sessionExpiry = 1000 * 60 * 60 * 24 * 7;
    await createSession(res, user, sessionExpiry);
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
      { session: mongooseSession },
    );

    await User.create(
      [
        {
          _id: userId,
          name,
          email,
          authProviders: ["google"],
          rootDirId,
          role: "user",
          isDeleted: false,
        },
      ],
      { session: mongooseSession },
    );

    const sessionExpiry = 60 * 60 * 24 * 7 * 1000;
    await mongooseSession.commitTransaction();

    await createSession(
      res,
      {
        _id: userId,
        id: userId.toString(),
        rootDirId,
        role: "user",
      },
      sessionExpiry,
    );

    return res.status(201).json({ message: "User Registered and logged in." });
  } catch (err) {
    await mongooseSession.abortTransaction();
    next(err);
  }
};

export const loginWithGithub = async (req, res, next) => {
  const { code } = req.body;

  try {
    const { name, email, picture } = await verifyGithubCode(code);

    const user = await User.findOne({ email });

    if (user) {
      const shouldSaveUser =
        ensureAuthProvider(user, "github") ||
        !user.picture.includes("githubusercontent.com") &&
          !user.picture.includes("googleusercontent.com") &&
          user.picture !== picture;

      if (!user.picture.includes("githubusercontent.com")) {
        user.picture = picture;
      }

      if (shouldSaveUser) {
        await user.save();
      }
      const sessionExpiry = 1000 * 60 * 60 * 24 * 7;
      await createSession(res, user, sessionExpiry);
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
        { session: mongooseSession },
      );
      await User.create(
        [
          {
            _id: userId,
            name,
            email,
            authProviders: ["github"],
            rootDirId,
            role: "user",
            isDeleted: false,
          },
        ],
        { session: mongooseSession },
      );

      const sessionExpiry = 60 * 60 * 24 * 7 * 1000;
      await mongooseSession.commitTransaction();

      await createSession(
        res,
        {
          _id: userId,
          id: userId.toString(),
          rootDirId,
          role: "user",
        },
        sessionExpiry,
      );

      return res
        .status(201)
        .json({ message: "User Registered and logged in." });
    } catch (err) {
      await mongooseSession.abortTransaction();
      throw err;
    }
  } catch (err) {
    next(err);
  }
};
