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
});

export const passwordUpdateSchema = z
  .object({
    currentPassword: z.string().min(6).optional().or(z.literal("")),
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters long"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const otpSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().regex(/^[0-9]{6}$/, "Please enter a valid 6 digit OTP"),
});

export const passwordResetRequestSchema = z.object({
  email: z.email("Invalid email address"),
});

export const passwordResetCompleteSchema = z
  .object({
    email: z.email("Invalid email address"),
    resetToken: z.string().uuid("Invalid reset session"),
    newPassword: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(6, "Password must be at least 6 characters long"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
