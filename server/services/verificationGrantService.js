import crypto from "crypto";
import redisClient from "../config/redis.js";

const GRANT_TTL_SECONDS = 10 * 60;

function grantKey(purpose, token) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  return `verification-grant:${purpose}:${tokenHash}`;
}

export async function createEmailGrant(purpose, email) {
  const token = crypto.randomUUID();
  await redisClient.set(grantKey(purpose, token), email, {
    EX: GRANT_TTL_SECONDS,
  });
  return token;
}

export async function consumeEmailGrant(purpose, token, expectedEmail) {
  const email = await redisClient.sendCommand([
    "GETDEL",
    grantKey(purpose, token),
  ]);
  return email === expectedEmail;
}
