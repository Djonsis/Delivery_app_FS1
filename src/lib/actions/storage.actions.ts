
"use server";

import { getStorageStatus } from "@/lib/storage.service";
import { getSignedUrlForUpload } from "@/lib/storage.service";
import { logger } from "../logger";
import { z } from "zod";

const storageActionLogger = logger.withCategory("STORAGE_ACTION");

export interface StorageStatus {
    bucketName?: string;
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    connected: boolean;
    error?: string;
}

export async function getStorageStatusAction(): Promise<StorageStatus> {
    try {
        const status = await getStorageStatus();
        storageActionLogger.info("Successfully fetched storage status via service.");
        return status;
    } catch (error) {
        storageActionLogger.error("Failed to get storage status via service", error as Error);
        return {
            connected: false,
            error: (error as Error).message
        }
    }
}


const getPresignedUrlSchema = z.object({
    filename: z.string(),
    contentType: z.string(),
});

export async function getPresignedUrlAction(data: unknown): Promise<{ success: boolean; url?: string; objectKey?: string; error?: string }> {
    const validatedFields = getPresignedUrlSchema.safeParse(data);
    if (!validatedFields.success) {
        const error = "Неверные входные данные.";
        storageActionLogger.error("Invalid input for getPresignedUrlAction", { error, validationErrors: validatedFields.error.flatten().fieldErrors });
        return { success: false, error };
    }
    
    try {
        const { url, objectKey } = await getSignedUrlForUpload(validatedFields.data);
        storageActionLogger.info("Successfully generated presigned URL via service.");
        return { success: true, url, objectKey };
    } catch (error) {
        storageActionLogger.error("Error generating presigned URL via service", error as Error);
        return { success: false, error: "Не удалось сгенерировать URL для загрузки." };
    }
}
