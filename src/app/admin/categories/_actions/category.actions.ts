
"use server";

import { z } from "zod";
import { categoriesService } from "@/lib/categories.service";
import { serverLogger } from "@/lib/server-logger";
import { revalidatePath } from "next/cache";

const categoryActionLogger = serverLogger.withCategory("CATEGORY_ACTION");

const categorySchema = z.object({
  name: z.string().min(2, "Название должно быть не менее 2 символов."),
  sku_prefix: z.string().min(1, "Префикс обязателен.").max(10, "Префикс не должен превышать 10 символов."),
  description: z.string().optional(),
});

function revalidateCategoryPaths() {
    revalidatePath('/admin/categories');
    revalidatePath('/admin/products');
    revalidatePath('/catalog');
    revalidatePath('/');
}

export async function createCategoryAction(values: unknown) {
    const validatedFields = categorySchema.safeParse(values);

    if (!validatedFields.success) {
        return { success: false, message: "Неверные данные формы.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    const { description, ...rest } = validatedFields.data;
    const categoryData = {
        ...rest,
        description: description ?? null,
    };

    categoryActionLogger.info("Attempting to create category", { data: categoryData });
    const result = await categoriesService.create(categoryData);

    if (result.success) {
        categoryActionLogger.info("Successfully created category.", { name: categoryData.name });
        revalidateCategoryPaths();
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
    
    const { description, ...rest } = validatedFields.data;
    const categoryData = {
        ...rest,
        description: description ?? null,
    };

    categoryActionLogger.info(`Attempting to update category ${id}`, { data: categoryData });
    const result = await categoriesService.update(id, categoryData);

    if (result.success) {
        categoryActionLogger.info(`Successfully updated category ${id}.`);
        revalidateCategoryPaths();
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
    const result = await categoriesService.delete(id);
    
    if (result.success) {
        categoryActionLogger.info(`Successfully deleted category ${id}.`);
        revalidateCategoryPaths();
    } else {
        categoryActionLogger.error(`Failed to delete category ${id}`, { message: result.message });
    }

    return result;
}
