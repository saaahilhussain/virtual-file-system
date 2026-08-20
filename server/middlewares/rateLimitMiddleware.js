import crypto from "crypto";
import redisClient from "../config/redis.js";

const INCREMENT_WITH_EXPIRY = `
  local count = redis.call("INCR", KEYS[1])
  if count == 1 then
    redis.call("EXPIRE", KEYS[1], ARGV[1])
  end
  return count
`;

const clientIp = (req) => req.ip || req.socket?.remoteAddress || "unknown";

export const emailIdentity = (req) =>
  typeof req.body?.email === "string"
    ? req.body.email.trim().toLowerCase()
    : "unknown";

export const userIdentity = (req) => String(req.user?._id || "unknown");

/**
 * Creates a Redis-backed fixed-window rate limiter. Values are hashed before
 * being used in Redis keys so email addresses and IP addresses are not stored
 * in plain text.
 */
export function createRateLimiter({
  name,
  max,
  windowSeconds,
  keyGenerator = clientIp,
  message = "Too many requests. Please try again later.",
}) {
  return async (req, res, next) => {
    try {
      const identity = keyGenerator(req);
      const digest = crypto
        .createHash("sha256")
        .update(String(identity))
        .digest("hex");
      const key = `rate-limit:${name}:${digest}`;
      const count = await redisClient.eval(INCREMENT_WITH_EXPIRY, {
        keys: [key],
        arguments: [String(windowSeconds)],
      });
      const remaining = Math.max(0, max - count);

      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(remaining));

      if (count > max) {
        const ttl = await redisClient.ttl(key);
        const retryAfter = Math.max(1, ttl);
        res.set(
          "RateLimit-Reset",
          String(Math.ceil(Date.now() / 1000) + retryAfter),
        );
        res.set("Retry-After", String(retryAfter));
        return res.status(429).json({ error: message, retryAfter });
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}
