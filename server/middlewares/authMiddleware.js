import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  if (!uid) {
    return res.status(401).json({ error: "Not logged!" });
  }

  const { id, expiry } = JSON.parse(Buffer.from(uid, "base64url").toString());
  const currentTime = Math.round(Date.now() / 1000);
  if (currentTime > expiry) {
    res.clearCookie("uid");
    return res.status(401).json({ error: "Not logged in!" });
  }

  const user = await User.findOne({ _id: id });
  if (!user) {
    return res.status(401).json({ error: "Not logged in!" });
  }

  req.user = user;
  next();
}
