import { Schema, model } from "mongoose";

const otpSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  purpose: {
    type: String,
    enum: ["registration", "password_reset"],
    required: true,
  },
  codeHash: {
    type: String,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600,
  },
});

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

const Otp = model("Otp", otpSchema);

export default Otp;
