import { ROLES } from "../config/roles.js";
import redisClient from "../config/redis.js";

export default async function checkAuth(req, res, next) {
  try {
    const { sid } = req.signedCookies;
    if (!sid) {
      return res.status(401).json({ error: "Not logged!" });
    }

    const redisKey = `session:${sid}`;
    const session = await redisClient.json.get(redisKey);

    if (!session) {
      res.clearCookie("sid");
      return res.status(401).json({ error: "Not logged!" });
    }

    req.user = {
      _id: session.userId,
      rootDirId: session.rootDirId,
      role: String(session.role || "user").toLowerCase(),
    };
    req.sessionId = sid;
    // Activity tracking should never add a network round trip to every API request.
    redisClient.json
      .set(redisKey, "$.lastActiveAt", new Date().toISOString())
      .catch((error) =>
        console.error("Unable to update session activity", error),
      );
    return next();
  } catch (err) {
    return next(err);
  }
}

export function checkIsNotUser(req, res, next) {
  if (req.user.role !== "user") {
    return next();
  }
  return res.status(403).json({ error: "Unauthorised to access users" });
}

/**
 * Attaches req.user when a valid session cookie exists but never rejects
 * anonymous visitors. Used by public endpoints that personalize access
 * (e.g. email-restricted share links) without requiring sign-in.
 */
export async function optionalAuth(req, res, next) {
  try {
    const { sid } = req.signedCookies || {};
    if (!sid) return next();

    const redisKey = `session:${sid}`;
    const session = await redisClient.json.get(redisKey);
    if (!session) return next();

    req.user = {
      _id: session.userId,
      rootDirId: session.rootDirId,
      role: String(session.role || "user").toLowerCase(),
    };
    req.sessionId = sid;
    redisClient.json
      .set(redisKey, "$.lastActiveAt", new Date().toISOString())
      .catch((error) =>
        console.error("Unable to update session activity", error),
      );
    return next();
  } catch (err) {
    return next(err);
  }
}

export const requirePermissionMiddleware = (requiredPermission) => {
  return (req, res, next) => {
    // 1. Auth guard
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = String(req.user.role).toLowerCase();
    const rolePermissions = ROLES[role];

    // 2. Role sanity check
    if (!rolePermissions) {
      return res.status(403).json({ error: "Invalid role" });
    }

    // 3. Permission check
    if (!rolePermissions.includes(requiredPermission)) {
      return res.status(403).json({
        error: "Forbidden: insufficient permissions",
      });
    }

    next();
  };
};

export const requireAnyPermissionMiddleware = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const rolePermissions = ROLES[String(req.user.role).toLowerCase()];
    if (!rolePermissions) {
      return res.status(403).json({ error: "Invalid role" });
    }

    if (
      !requiredPermissions.some((permission) =>
        rolePermissions.includes(permission),
      )
    ) {
      return res.status(403).json({
        error: "Forbidden: insufficient permissions",
      });
    }

    return next();
  };
};
