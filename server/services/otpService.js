import { Resend } from "resend";
import Otp from "../models/otpModel.js";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

function hashValue(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export async function sendOtpService(email, purpose = "registration") {
  const existingOtp = await Otp.findOne({ email, purpose });
  if (
    existingOtp &&
    Date.now() - existingOtp.createdAt.getTime() <
      RESEND_COOLDOWN_SECONDS * 1000
  ) {
    const error = new Error("Please wait before requesting another code.");
    error.status = 429;
    throw error;
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const isPasswordReset = purpose === "password_reset";

  await Otp.findOneAndUpdate(
    { email, purpose },
    { codeHash: hashValue(otp), attempts: 0, createdAt: new Date() },
    { upsert: true, runValidators: true },
  );

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #374151;">Your Verification Code</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">${isPasswordReset ? "Enter this code to reset your password" : "Enter this code to verify your email"}</p>
      <div style="letter-spacing: 12px; font-size: 36px; font-weight: 700; color: #111827; background: #f3f4f6; padding: 16px; border-radius: 8px;">
        ${otp}
      </div>
      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">Expires in 10 minutes. Do not share this code.</p>
    </div>
  `;

  await resend.emails.send({
    from: "File Shelter <dont-reply@fileshelter.app>",
    to: email,
    subject: isPasswordReset
      ? "Your File Shelter password reset code"
      : "Your File Shelter verification code",
    html,
  });

  return { success: true, message: "OTP sent successfully" };
}

export async function verifyOtpService(email, otp, purpose) {
  const otpRecord = await Otp.findOne({ email, purpose });

  if (!otpRecord) return false;

  if (otpRecord.codeHash !== hashValue(otp)) {
    otpRecord.attempts += 1;
    if (otpRecord.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      await Otp.deleteOne({ _id: otpRecord._id });
    } else {
      await otpRecord.save();
    }
    return false;
  }

  await Otp.deleteOne({ _id: otpRecord._id });
  return true;
}
