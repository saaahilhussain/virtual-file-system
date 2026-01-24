import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  const { uid } = req.cookies;
  const db = req.db;
  if (!uid) {
    return res.status(401).json({ error: "Not logged!" });
  }

  const user = await User.findOne({ _id: uid });
  if (!user) {
    return res.status(401).json({ error: "Not logged!" });
  }

  req.user = user;
  next();
}
