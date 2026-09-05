import Razorpay from "razorpay";

export const razorPayInstance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SECRET,
});

// The installed SDK exposes its Axios transport here (it does not forward a
// constructor timeout). Bound outages so webhook requests can fail and retry.
razorPayInstance.api.rq.defaults.timeout = 4000;
