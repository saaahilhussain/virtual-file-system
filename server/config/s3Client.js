import { S3Client } from "@aws-sdk/client-s3";

// Local development can retain the legacy key pair. On EC2, leave both unset
// so the SDK obtains rotating credentials from the instance profile.
const accessKeyId = process.env.S3_PROFILE_ACCESS_ID;
const secretAccessKey = process.env.S3_PROFILE_ACCESS_SECRET;
if (Boolean(accessKeyId) !== Boolean(secretAccessKey)) {
  throw new Error("Set both S3_PROFILE_ACCESS_ID and S3_PROFILE_ACCESS_SECRET, or neither.");
}

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  // Presigned PUTs have no body at signing time. Do not sign an automatically
  // calculated empty-body checksum for bytes the browser will supply later.
  // Operations requiring request checksums (e.g. bulk delete) still receive one.
  requestChecksumCalculation: "WHEN_REQUIRED",
  ...(accessKeyId && secretAccessKey
    ? { credentials: { accessKeyId, secretAccessKey } }
    : {}),
});
