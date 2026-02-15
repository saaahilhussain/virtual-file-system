import Otp from "../models/otpModel.js";
import { sendOtpService } from "../services/otpService.js";

export const sendOtp = async (req, res, next) => {
  const { email } = req.body;

  const existingEmail = await Otp.findOne({ email }).lean();
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
  return res.status(200).json({ message: "OTP verified successfully" });
};
