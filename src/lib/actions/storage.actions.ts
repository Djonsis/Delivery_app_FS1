
"use server";

import { getStorageStatus } from "@/lib/storage.service";
import { getSignedUrlForUpload, uploadFile } from "@/lib/storage.service";
import { logger } from "../logger";
import { z } from "zod";
import { StorageStatus } from "../types";
import { publicConfig } from "../public-config";

const storageActionLogger = logger.withCategory("STORAGE_ACTION");

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


export async function uploadImageAction(formData: FormData): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const file = formData.get("file") as File;
  if (!file) {
    return { success: false, error: "Файл не найден." };
  }

  try {
    storageActionLogger.info("Attempting to upload file via service", { filename: file.name, size: file.size });
    const { objectKey } = await uploadFile({
      file,
      contentType: file.type,
    });
    
    const imageUrl = `${publicConfig.s3.publicUrl}/${objectKey}`;
    storageActionLogger.info("Successfully uploaded file and got public URL", { imageUrl });
    
    return { success: true, imageUrl };
  } catch (error) {
    storageActionLogger.error("Failed to upload image via action", error as Error);
    return { success: false, error: "Не удалось загрузить изображение." };
  }
};
