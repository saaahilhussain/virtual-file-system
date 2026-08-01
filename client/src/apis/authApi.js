const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;
import { parseApiResponse } from "./apiResponse";

/**
 * Send OTP to email
 */
export async function sendOtp(email) {
  const res = await fetch(`${BASE_URL}/auth/send-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return parseApiResponse(res, "Failed to send OTP");
}

/**
 * Verify OTP
 */
export async function verifyOtp(email, otp) {
  const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, otp }),
  });

  return parseApiResponse(res, "Failed to verify OTP");
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return parseApiResponse(res, "Failed to send reset code");
}

export async function verifyPasswordReset(email, otp) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  return parseApiResponse(res, "Failed to verify reset code");
}

export async function completePasswordReset(payload) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  return parseApiResponse(res, "Failed to reset password");
}
