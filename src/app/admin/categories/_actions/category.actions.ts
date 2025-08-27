
"use server";

import { z } from "zod";
import { createCategory, updateCategory, deleteCategory } from "@/lib/categories.service";
import { logger } from "@/lib/logger";

const categoryActionLogger = logger.withCategory("CATEGORY_ACTION");

const categorySchema = z.object({
  name: z.string().min(2, "Название должно быть не менее 2 символов."),
  sku_prefix: z.string().min(1, "Префикс обязателен.").max(10, "Префикс не должен превышать 10 символов."),
  description: z.string().optional(),
});


export async function createCategoryAction(values: unknown) {
    const validatedFields = categorySchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Неверные данные формы.", errors: validatedFields.error.flatten().fieldErrors };
    }

    categoryActionLogger.info("Attempting to create category", { data: validatedFields.data });
    const result = await createCategory(validatedFields.data);

    if (result.success) {
        categoryActionLogger.info("Successfully created category.", { name: validatedFields.data.name });
    } else {
        categoryActionLogger.error("Failed to create category", { message: result.message });
    }

    return result;
}

export async function updateCategoryAction(id: string, values: unknown) {
    if (!id) {
        return { success: false, message: "ID категории не предоставлен." };
    }
    const validatedFields = categorySchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Неверные данные формы.", errors: validatedFields.error.flatten().fieldErrors };
    }

    categoryActionLogger.info(`Attempting to update category ${id}`, { data: validatedFields.data });
    const result = await updateCategory(id, validatedFields.data);

    if (result.success) {
        categoryActionLogger.info(`Successfully updated category ${id}.`);
    } else {
        categoryActionLogger.error(`Failed to update category ${id}`, { message: result.message });
    }

    return result;
}


export async function deleteCategoryAction(id: string) {
    if (!id) {
        return { success: false, message: "ID категории не предоставлен." };
    }

    categoryActionLogger.info(`Attempting to delete category ${id}`);
    const result = await deleteCategory(id);
    
    if (result.success) {
        categoryActionLogger.info(`Successfully deleted category ${id}.`);
    } else {
        categoryActionLogger.error(`Failed to delete category ${id}`, { message: result.message });
    }

    return result;
}
