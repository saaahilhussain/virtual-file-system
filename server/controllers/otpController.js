import { sendOtp } from "../services/otpService.js";

export const sendOtpController = async (req, res) => {
  const { email } = req.body;

  const result = await sendOtp(email);

  return res.status(200).json(result);
};
