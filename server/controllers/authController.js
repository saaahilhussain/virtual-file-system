import mongoose, { Types } from "mongoose";
import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";
import Otp from "../models/otpModel.js";
import { verifyIdToken } from "../services/googleAuthService.js";
import { verifyGithubCode } from "../services/githubAuthService.js";
import { sendOtpService } from "../services/otpService.js";

export const sendOtp = async (req, res, next) => {
  const { email } = req.body;

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
  const { email, otp } = req.body;

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
    const allSessions = await Session.find({ userId: user.id });

    if (allSessions.length >= 2) {
      await allSessions[0].deleteOne();
    }

    if (!user.picture.includes("googleusercontent.com")) {
      user.picture = picture;
      await user.save();
    }

    const session = await Session.create({ userId: user._id });

    res.cookie("sid", session.id, {
      httpOnly: true,
      signed: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
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
          picture,
          rootDirId,
        },
      ],
      { mongooseSession },
    );

    const session = await Session.create([{ userId }], { mongooseSession });

    mongooseSession.commitTransaction();

    res.cookie("sid", session[0].id, {
      httpOnly: true,
      signed: true,
      maxAge: 1000 * 60 * 60 * 24 * 7,
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
      const allSessions = await Session.find({ userId: user.id });

      if (allSessions.length >= 2) {
        await allSessions[0].deleteOne();
      }

      if (
        !user.picture.includes("githubusercontent.com") &&
        !user.picture.includes("googleusercontent.com")
      ) {
        user.picture = picture;
        await user.save();
      }

      const session = await Session.create({ userId: user._id });

      res.cookie("sid", session.id, {
        httpOnly: true,
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
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
            picture,
            rootDirId,
          },
        ],
        { mongooseSession },
      );

      const session = await Session.create([{ userId }], { mongooseSession });

      mongooseSession.commitTransaction();

      res.cookie("sid", session[0].id, {
        httpOnly: true,
        signed: true,
        maxAge: 1000 * 60 * 60 * 24 * 7,
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
