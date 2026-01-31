import { secretKey } from "../controllers/userController.js";
import User from "../models/userModel.js";
import crypto from "node:crypto";

export default async function checkAuth(req, res, next) {
  const { token } = req.cookies;
  if (!token) {
    return res.status(401).json({ error: "Not logged!" });
  }

  const [payload, oldSignature] = token.split(".");

  const jsonPayload = Buffer.from(payload, "base64url").toString();
  const newSignature = crypto
    .createHash("Sha256")
    .update(jsonPayload)
    .update(secretKey)
    .update(secretKey)
    .digest("base64url");

  const { id, expiry } = JSON.parse(jsonPayload);

  if (oldSignature !== newSignature) {
    res.clearCookie("token");
    console.log("Invalid Signature");
    return res.status(401).json({ error: "Not logged in!" });
  }

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
