import { sendOtpService } from "../services/otpService.js";

export const sendOtp = async (req, res) => {
  const { email } = req.body;

  const result = await sendOtpService(email);

  return res.status(200).json(result);
};
