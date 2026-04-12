import * as z from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
});

export const registerSchema = loginSchema.extend({
  name: z
    .string()
    .min(3, "Name must be at least 3 characters long")
    .max(50, "Name can be at max 50 characters"),
  otp: z.string().regex(/^[0-9]{4}$/, "Please enter a valid 4 digit OTP"),
});

export const otpSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().regex(/^[0-9]{4}$/, "Please enter a valid 4 digit OTP"),
});