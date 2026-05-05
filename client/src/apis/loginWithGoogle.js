const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

export async function loginWithGoogle(idToken) {
  const res = await fetch(`${BASE_URL}/auth/google`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ idToken }),
    credentials: "include",
  });

  const data = await res.json();
  return data;
}
