const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

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

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || "Failed to send OTP");
  }
  
  return data;
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

  const data = await res.json();
  
  if (!res.ok) {
    throw new Error(data.error || "Failed to verify OTP");
  }
  
  return data;
}

export async function requestPasswordReset(email) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to send reset code");
  return data;
}

export async function verifyPasswordReset(email, otp) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, otp }),
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to verify reset code");
  return data;
}

export async function completePasswordReset(payload) {
  const res = await fetch(`${BASE_URL}/auth/password-reset/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    credentials: "include",
  });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || "Failed to reset password");
  return data;
}
