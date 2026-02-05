import User from "../models/userModel.js";

export default async function checkAuth(req, res, next) {
  const { token } = req.signedCookies;
  if (!token) {
    return res.status(401).json({ error: "Not logged!" });
  }

  const { id, expiry } = JSON.parse(Buffer.from(token, "base64url").toString());
  console.log(id, expiry);

  const currentTime = Math.round(Date.now() / 1000);
  if (currentTime > expiry) {
    res.clearCookie("token");
    return res.status(401).json({ error: "Not logged in!" });
  }

  const user = await User.findOne({ _id: id });
  if (!user) {
    return res.status(401).json({ error: "Not logged in!" });
  }

  req.user = user;
  next();
}
