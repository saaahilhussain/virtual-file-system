import { S3Client } from "@aws-sdk/client-s3";

export const s3Client = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_PROFILE_ACCESS_ID,
    secretAccessKey: process.env.S3_PROFILE_ACCESS_SECRET,
  },
});
