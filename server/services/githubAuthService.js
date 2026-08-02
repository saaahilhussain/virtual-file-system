import fetch from "node-fetch"; // Or use native fetch if Node version >= 18

export const verifyGithubCode = async (code) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET } = process.env;
  const redirectUri = process.env.GITHUB_REDIRECT_URI;

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
        redirect_uri: redirectUri,
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

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const userData = await userResponse.json();

  const emailsResponse = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  const emailsData = await emailsResponse.json();

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
