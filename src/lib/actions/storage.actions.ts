
"use server";

import { serverLogger } from "../server-logger";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const storageActionLogger = serverLogger.withCategory("STORAGE_ACTION");

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
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    };
    
    const status: StorageStatus = {
        bucketName: config.bucketName,
        endpoint: config.endpoint,
        region: config.region,
        accessKeyId: config.accessKeyId ? `***${config.accessKeyId.slice(-4)}` : undefined,
        connected: false,
    };

    if (!config.bucketName || !config.endpoint || !config.region || !config.accessKeyId || !config.secretAccessKey) {
        status.error = "Одна или несколько переменных окружения для S3 не установлены (S3_BUCKET_NAME, S3_ENDPOINT_URL, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY).";
        storageActionLogger.warn("S3 status check failed: missing environment variables.");
        return status;
    }

    try {
        const s3Client = new S3Client({
            endpoint: config.endpoint,
            region: config.region,
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
            forcePathStyle: true, // Required for GCS S3 compatibility
        });

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
