
import { s3Client } from "@/lib/s3-client";
import { serverConfig } from "@/lib/config";
import { HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
import { StorageStatus } from "./types";

export async function getStorageStatus(): Promise<StorageStatus> {
    const { bucketName, endpoint, region, accessKeyId } = serverConfig.s3;
    
    const status: StorageStatus = {
        bucketName,
        endpoint,
        region,
        accessKeyId: accessKeyId ? `***${accessKeyId.slice(-4)}` : undefined,
        connected: false,
    };

    try {
        const command = new HeadBucketCommand({ Bucket: bucketName });
        await s3Client.send(command);
        status.connected = true;
        return status;
    } catch (error) {
        status.error = (error as Error).message;
        throw new Error(status.error); // Throw error to be caught by the action
    }
}

interface PresignedUrlInput {
    filename: string;
    contentType: string;
}

export async function getSignedUrlForUpload({ filename, contentType }: PresignedUrlInput): Promise<{ url: string; objectKey: string }> {
    const { bucketName } = serverConfig.s3;

    // Generate a unique object key to avoid filename collisions
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const objectKey = `products/${uniqueSuffix}-${filename}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
    });

    try {
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL is valid for 1 hour
        return { url, objectKey };
    } catch (error) {
        // In a service, we prefer to throw the error to let the caller handle it.
        throw new Error("Failed to generate presigned URL from service.");
    }
}


interface UploadFileInput {
  file: File;
  contentType: string;
}

export async function uploadFile({ file, contentType }: UploadFileInput): Promise<{ objectKey: string }> {
  const { bucketName } = serverConfig.s3;
  const uniqueSuffix = crypto.randomBytes(8).toString('hex');
  const objectKey = `products/${uniqueSuffix}-${file.name}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: objectKey,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read', // Make file publicly readable
  });

  try {
    await s3Client.send(command);
    return { objectKey };
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error("Failed to upload file to storage.");
  }
}
