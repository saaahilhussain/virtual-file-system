import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  // Presigned PUTs have no body at signing time. Do not sign an automatically
  // calculated empty-body checksum for bytes the browser will supply later.
  // Operations requiring request checksums (e.g. bulk delete) still receive one.
  requestChecksumCalculation: "WHEN_REQUIRED",
  credentials: {
    accessKeyId: process.env.S3_PROFILE_ACCESS_ID,
    secretAccessKey: process.env.S3_PROFILE_ACCESS_SECRET,
  },
});
