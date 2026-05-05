const BASE_URL = import.meta.env.VITE_BACKEND_BASE_URI;

export async function loginWithGithub(code) {
  const res = await fetch(`${BASE_URL}/auth/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
    credentials: "include",
  });

  const data = await res.json();
  return data;
}
