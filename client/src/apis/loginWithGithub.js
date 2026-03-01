const BASE_URL = "http://localhost:4000";

export async function loginWithGithub(code) {
  const res = await fetch(`${BASE_URL}/auth/github`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
    credentials: "include", // essential for setting the cookie
  });

  const data = await res.json();
  return data;
}
