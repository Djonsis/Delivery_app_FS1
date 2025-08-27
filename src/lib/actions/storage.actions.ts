
"use server";

import { serverLogger } from "../server-logger";
import { S3Client, HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import crypto from "crypto";

const storageActionLogger = serverLogger.withCategory("STORAGE_ACTION");

// --- S3 Client Singleton ---
// This prevents creating a new client for every request.
const s3Client = new S3Client({
    endpoint: process.env.S3_ENDPOINT_URL,
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
});

export interface StorageStatus {
    bucketName?: string;
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    connected: boolean;
    error?: string;
}

export async function getStorageStatusAction(): Promise<StorageStatus> {
    const config = {
        bucketName: process.env.S3_BUCKET_NAME,
        endpoint: process.env.S3_ENDPOINT_URL,
        region: process.env.S3_REGION,
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
    };
    
    const status: StorageStatus = {
        bucketName: config.bucketName,
        endpoint: config.endpoint,
        region: config.region,
        accessKeyId: config.accessKeyId ? `***${config.accessKeyId.slice(-4)}` : undefined,
        connected: false,
    };

    if (!config.bucketName || !config.endpoint || !config.region || !config.accessKeyId || !process.env.S3_SECRET_ACCESS_KEY) {
        status.error = "Одна или несколько переменных окружения для S3 не установлены (S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).";
        storageActionLogger.warn("S3 status check failed: missing environment variables.");
        return status;
    }

    try {
        const command = new HeadBucketCommand({ Bucket: config.bucketName });
        await s3Client.send(command);

        status.connected = true;
        storageActionLogger.info("Successfully connected to S3 storage.");
        return status;

    } catch (error) {
        storageActionLogger.error("Failed to connect to S3 storage", error as Error);
        status.error = (error as Error).message;
        return status;
    }
}


// --- New action to get a presigned URL ---

const getPresignedUrlSchema = z.object({
    filename: z.string(),
    contentType: z.string(),
});

export async function getPresignedUrlAction(data: unknown): Promise<{ success: boolean; url?: string; objectKey?: string; error?: string }> {
    const validatedFields = getPresignedUrlSchema.safeParse(data);
    if (!validatedFields.success) {
        storageActionLogger.error("Invalid input for getPresignedUrlAction", { errors: validatedFields.error.flatten().fieldErrors });
        return { success: false, error: "Неверные входные данные." };
    }

    const { filename, contentType } = validatedFields.data;
    const bucketName = process.env.S3_BUCKET_NAME;

    if (!bucketName) {
        return { success: false, error: "Имя бакета S3 не настроено." };
    }

    // Generate a unique object key to avoid filename collisions
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    const objectKey = `products/${uniqueSuffix}-${filename}`;

    const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        ContentType: contentType,
    });

    try {
        storageActionLogger.info("Generating presigned URL", { bucketName, objectKey, contentType });
        const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // URL is valid for 1 hour
        storageActionLogger.info("Successfully generated presigned URL");

        return { success: true, url, objectKey };

    } catch (error) {
        storageActionLogger.error("Error generating presigned URL", error as Error);
        return { success: false, error: "Не удалось сгенерировать URL для загрузки." };
    }
}
