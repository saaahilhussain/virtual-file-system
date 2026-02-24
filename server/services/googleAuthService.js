import { OAuth2Client } from "google-auth-library";

const clientId =
  "998571376846-gabola6fav477uj7fn7pccdl3inujr4u.apps.googleusercontent.com";

const client = new OAuth2Client({
  clientId,
});

export const verifyIdToken = async (idToken) => {
  const loginTicket = await client.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const userData = loginTicket.getPayload();
  return userData;
};
