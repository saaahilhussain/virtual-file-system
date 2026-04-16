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
