import { Resend } from "resend";
import Otp from "../models/otpModel.js";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpService(email) {
  const otp = Math.round(Math.random() * 1000 + 9000).toString();

  await Otp.findOneAndUpdate(
    { email }, // find by email
    { otp, createdAt: new Date() }, // update these fields
    { upsert: true }, // create if not found
  );

  const html = `
    <div style="font-family: 'Segoe UI', sans-serif; max-width: 400px; margin: 0 auto; padding: 32px; text-align: center; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin: 0 0 8px; font-size: 18px; color: #374151;">Your Verification Code</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #6b7280;">Enter this code to verify your email</p>
      <div style="letter-spacing: 12px; font-size: 36px; font-weight: 700; color: #111827; background: #f3f4f6; padding: 16px; border-radius: 8px;">
        ${otp}
      </div>
      <p style="margin: 24px 0 0; font-size: 12px; color: #9ca3af;">Expires in 10 minutes. Do not share this code.</p>
    </div>
  `;

  await resend.emails.send({
    from: "File Shelter <dont-reply@sahilhussain.tech>",
    to: email,
    subject: "Here's your registration OTP",
    html,
  });

  return { success: true, message: "OTP sent successfully" };
}
