import fetch from "node-fetch"; // Or use native fetch if Node version >= 18

export const verifyGithubCode = async (code) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;

  // 1. Exchange code for access token
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    },
  );

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    throw new Error(
      tokenData.error_description || "Failed to get GitHub access token",
    );
  }
 
  const accessToken = tokenData.access_token;

  // 2. Fetch user profile
  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const userData = await userResponse.json();

  // 3. Fetch user emails (since the primary email might be private)
  const emailsResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const emailsData = await emailsResponse.json();

  // Find the primary, verified email
  const primaryEmail = emailsData.find(
    (email) => email.primary && email.verified,
  );

  if (!primaryEmail) {
    throw new Error("No verified primary email found on GitHub account.");
  }

  return {
    name: userData.name || userData.login,
    email: primaryEmail.email,
    picture: userData.avatar_url,
  };
};
