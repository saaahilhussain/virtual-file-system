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

export const createSignedUploadUrl = async ({
  Key,
  ContentType,
  ContentLength,
}) => {
  const command = new PutObjectCommand({
    Bucket,
    Key,
    ContentType,
    ContentLength,
  });

  return await getSignedUrl(s3Client, command, {
    expiresIn: 300,
    signableHeaders: new Set(["content-length"]),
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
  const command = new HeadObjectCommand({ Bucket, Key });

  return s3Client.send(command);
};

export const deleteS3File = async (Key) => {
  const command = new DeleteObjectCommand({ Bucket, Key });

  return s3Client.send(command);
};

export const deleteS3Files = async (keys) => {
  const result = { Deleted: [], Errors: [] };
  for (let offset = 0; offset < keys.length; offset += 1000) {
    const response = await s3Client.send(
      new DeleteObjectsCommand({
        Bucket,
        Delete: { Objects: keys.slice(offset, offset + 1000), Quiet: false },
      }),
    );
    result.Deleted.push(...(response.Deleted || []));
    result.Errors.push(...(response.Errors || []));
  }
  return result;
};
