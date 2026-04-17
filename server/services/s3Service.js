import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({ profile: "nodejs" });

export const createSignedUploadUrl = async ({ Key, ContentType }) => {
  const command = new PutObjectCommand({
    Bucket: "sahil-h-storage-app",
    Key,
    ContentType,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    signableHeaders: new Set(["ContentType"]),
  });
};

export const createSignedGetUrl = async ({
  Key,
  download = false,
  filename,
}) => {
  const command = new GetObjectCommand({
    Bucket: "sahil-h-storage-app",
    Key,
    ResponseContentDisposition: `${download ? "attachment" : "inline"}; filename=${filename}`,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 300,
  });

  return getUrl;
};

export const getFileMetaData = async (Key) => {
  const command = new HeadObjectCommand({ Bucket: "sahil-h-storage-app", Key });

  return s3Client.send(command);
};
