import { ROLES } from "../config/roles.js";
import redisClient from "../config/redis.js";

export default async function checkAuth(req, res, next) {
  const { sid } = req.signedCookies;
  if (!sid) {
    return res.status(401).json({ error: "Not logged!" });
  }
  // const session = await Session.findById(sid);
  const redisKey = `session:${sid}`;
  const session = await redisClient.json.get(redisKey);

  if (!session) {
    res.clearCookie("sid");
    return res.status(401).json({ error: "Not logged!" });
  }

  req.user = { _id: session.userId, rootDirId: session.rootDirId };
  next();
}

export function checkNotUser(req, res, next) {
  if (req.user.role !== "user") {
    return next();
  }
  return res.status(403).json({ error: "Unauthorised to access users" });
}

export const requirePermissionMiddleware = (requiredPermission) => {
  return (req, res, next) => {
    // 1. Auth guard
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const role = req.user.role;
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
