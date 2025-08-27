
"use server";

import { s3Client } from "@/lib/s3-client";
import { appConfig } from "@/lib/config";
import { serverLogger } from "../server-logger";
import { HeadBucketCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { z } from "zod";
import crypto from "crypto";

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
    const { bucketName, endpoint, region, accessKeyId } = appConfig.s3;
    
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
    const { bucketName } = appConfig.s3;

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
