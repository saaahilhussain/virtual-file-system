import { vi } from "vitest";

process.env.SESSION_SECRET = "test-session-secret";
process.env.WEBHOOK_SECRET = "test-webhook-secret";
process.env.RZP_KEY_ID = "rzp_test_key";
process.env.RZP_KEY_SECRET = "test-key-secret";
process.env.RZP_PLAN_PRO_MONTHLY = "plan_pro_monthly_test";
process.env.RZP_PLAN_PRO_YEARLY = "plan_pro_yearly_test";
process.env.RZP_PLAN_PREMIUM_MONTHLY = "plan_premium_monthly_test";
process.env.RZP_PLAN_PREMIUM_YEARLY = "plan_premium_yearly_test";
process.env.S3_BUCKET = "test-bucket";
process.env.AWS_REGION = "us-east-1";
process.env.S3_PROFILE_ACCESS_ID = "test-access-key";
process.env.S3_PROFILE_ACCESS_SECRET = "test-secret-key";
process.env.CLOUDFRONT_DOMAIN = "https://cdn.example.test";
process.env.CLOUDFRONT_PUBLIC_ID = "test-key-pair";
process.env.CLOUDFRONT_PRIVATE_KEY = "test-private-key";
process.env.GOOGLE_CLIENT_ID = "test-google-client";
process.env.RESEND_API_KEY = "re_test_key";

vi.mock("../config/redis.js", async () => {
  const { redisMock } = await import("./helpers/redisMock.js");
  return {
    default: redisMock,
    connectRedis: vi.fn(async () => {}),
  };
});

vi.mock("../services/s3Service.js", () => ({
  createSignedUploadUrl: vi.fn(async () => "https://s3.example.test/upload"),
  createSignedGetUrl: vi.fn(async () => "https://s3.example.test/download"),
  getFileMetaData: vi.fn(async () => ({ ContentLength: 0 })),
  deleteS3File: vi.fn(async () => ({})),
  deleteS3Files: vi.fn(async (keys) => ({ Deleted: keys })),
}));
