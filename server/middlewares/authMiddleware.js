import Session from "../models/sessionModel.js";
import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  const { sid } = req.signedCookies;
  if (!sid) {
    return res.status(401).json({ error: "Not logged!" });
  }
  const session = await Session.findById(sid);

  if (!session) {
    res.clearCookie("sid");
    return res.status(401).json({ error: "Not logged!" });
  }

  const user = await User.findOne({ _id: session.userId });
  if (!user) {
    return res.status(401).json({ error: "Not logged in!" });
  }

  req.user = user;
  next();
}
