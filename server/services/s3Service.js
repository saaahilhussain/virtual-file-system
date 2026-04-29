import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client } from "../config/s3Client.js";

const Bucket = process.env.S3_BUCKET;

export const createSignedUploadUrl = async ({ Key, ContentType }) => {
  const command = new PutObjectCommand({
    Bucket,
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
    Bucket,
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

export const deleteS3File = async (Key) => {
  const command = new DeleteObjectCommand({ Bucket, Key });

  return s3Client.send(command);
};

export const deleteS3Files = async (keys) => {
  const command = new DeleteObjectsCommand({
    Bucket,
    Delete: {
      Objects: keys,
      Quiet: false,
    },
  });
  return s3Client.send(command);
};
