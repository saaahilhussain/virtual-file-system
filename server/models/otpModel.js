import { Schema, model } from "mongoose";

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    minLength: [4, "OTP must be 4 digits"],
    maxLength: [4, "OTP must be 4 digits"],
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

const Otp = model("Otp", otpSchema);

export default Otp;
