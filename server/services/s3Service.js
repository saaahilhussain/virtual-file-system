import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({profile: "nodejs"});

export const createSignedUploadUrl = ({Key, ContentType}) => {
    const command = 
}
