import mongoose, { Types } from "mongoose";
import User from "../models/userModel.js";
import Directory from "../models/directoryModel.js";

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
    await Directory.insertOne(
      {
        _id: rootDirId,
        name: `root-${email}`,
        parentDirId: null,
        userId,
      },
      { session },
    );

    await User.insertOne(
      {
        _id: userId,
        name,
        email,
        password,
        rootDirId,
      },
      { session },
    );

    session.commitTransaction();

    res.clearCookie("uid");
    res.cookie("uid", userId.toString(), {
      httpOnly: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
    });

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
  const user = await User.findOne({ email, password });
  if (!user) {
    return res.status(404).json({ error: "Invalid Credentials" });
  }

  const cookiePayload = {
    id: user._id.toString(),
    expiry: Math.round(Date.now() / 1000 + 10),
  };

  res.cookie(
    "uid",
    Buffer.from(JSON.stringify(cookiePayload)).toString("base64url"),
    {
      httpOnly: true,
      maxAge: 60 * 1000 * 60 * 24 * 7,
    },
  );
  return res.status(200).json({ message: "logged in" });
};

export const getUser = (req, res) => {
  res.status(200).json({
    name: req.user.name,
    email: req.user.email,
  });
};

export const logoutUser = (req, res) => {
  res.clearCookie("uid");
  res.status(204).end();
};
