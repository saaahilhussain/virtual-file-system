import crypto from "crypto";
import redisClient from "../config/redis.js";

const SESSION_PREFIX = "session:";
const MAX_ACTIVE_SESSIONS = 2;

function deviceLabel(userAgent = "") {
  const browser = userAgent.includes("Edg/")
    ? "Microsoft Edge"
    : userAgent.includes("Firefox/")
      ? "Firefox"
      : userAgent.includes("Chrome/")
        ? "Chrome"
        : userAgent.includes("Safari/")
          ? "Safari"
          : "Unknown browser";
  const platform = /iPhone|iPad|iPod/i.test(userAgent)
    ? "iOS"
    : /Android/i.test(userAgent)
      ? "Android"
      : /Windows/i.test(userAgent)
        ? "Windows"
        : /Mac OS X/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "Unknown device";

  return `${browser} on ${platform}`;
}

export async function getUserSessionKeys(userId) {
  const sessions = await redisClient.ft.search(
    "userIdIdx",
    `@userId:{${userId}}`,
    { RETURN: [] },
  );
  return sessions.documents.map((session) => session.id);
}

export async function createSession({ res, req, user, sessionExpiry, isProd }) {
  const existingSessionKeys = await getUserSessionKeys(user.id);
  const existingSessions = await Promise.all(
    existingSessionKeys.map(async (key) => ({
      key,
      data: await redisClient.json.get(key),
    })),
  );

  if (existingSessions.length >= MAX_ACTIVE_SESSIONS) {
    const oldestSession = existingSessions
      .sort(
        (left, right) =>
          new Date(left.data?.createdAt || 0) - new Date(right.data?.createdAt || 0),
      )[0];
    if (oldestSession) await redisClient.del(oldestSession.key);
  }

  const sessionId = crypto.randomUUID();
  const redisKey = `${SESSION_PREFIX}${sessionId}`;
  const now = new Date().toISOString();
  const userAgent = req.get("user-agent") || "";

  await redisClient.json.set(redisKey, "$", {
    userId: user._id.toString(),
    rootDirId: user.rootDirId.toString(),
    role: user.role,
    device: deviceLabel(userAgent),
    createdAt: now,
    lastActiveAt: now,
  });
  await redisClient.expire(redisKey, sessionExpiry / 1000);

  res.cookie("sid", sessionId, {
    httpOnly: true,
    signed: true,
    maxAge: sessionExpiry,
    secure: isProd,
    sameSite: "lax",
  });
}
