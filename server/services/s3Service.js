import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ profile: "nodejs" });

export const createSignedUploadUrl = async ({ Key, ContentType }) => {
  const command = new PutObjectCommand({
    Bucket: "sahil-h-storage-app",
    Key,
    ContentType,
  });

  const signedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    signableHeaders: new Set(["ContentType"]),
  });

  return signedUrl;
};
