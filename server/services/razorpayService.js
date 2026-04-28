import Razorpay from "razorpay";

export const razorPayInstance = new Razorpay({
  key_id: process.env.RZP_TEST_ID,
  key_secret: process.env.RZP_TEST_SECRET,
});
