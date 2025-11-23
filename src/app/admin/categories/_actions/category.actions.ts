'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { categoriesService } from "@/lib/categories.service";
import { serverLogger } from "@/lib/server-logger";
import { CategoryCreateInput, CategoryUpdateInput } from "@/lib/types";

const categoryLogger = serverLogger.withCategory("CATEGORY_ACTION");

const categorySchema = z.object({
  name: z.string().min(2, "Название категории должно быть не менее 2 символов."),
  description: z.string().optional(),
  sku_prefix: z.string()
    .min(2, "Префикс должен содержать от 2 до 4 заглавных букв.")
    .max(4, "Префикс должен содержать от 2 до 4 заглавных букв.")
    .regex(/^[A-Z]+$/, "Префикс должен состоять только из заглавных букв.")
});

function revalidateCategoryPaths(id?: string) {
  revalidatePath("/admin/categories");
  if (id) revalidatePath(`/admin/categories/${id}/edit`);
    else revalidatePath("/admin/categories/new");
}

export async function createCategoryAction(values: unknown) {
  const validated = categorySchema.safeParse(values);

  if (!validated.success) {
    const errors = validated.error.flatten().fieldErrors;
    categoryLogger.error("Category creation failed due to validation errors", { errors });
    return { success: false, message: "Неверные данные формы.", errors };
  }

  try {
    const { description, ...rest } = validated.data;
    const categoryData: CategoryCreateInput = {
        ...rest,
        description: description ?? null,
    };
    const result = await categoriesService.create(categoryData);

    if (result.success) {
      categoryLogger.info("Category created successfully", { id: result.category?.id, name: result.category?.name });
      revalidateCategoryPaths();
    }

    return result;
  } catch (error) {
    categoryLogger.error("Unexpected error in createCategoryAction", { error: error as Error });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось создать категорию." };
  }
}

export async function updateCategoryAction(id: string, values: unknown) {
  if (!id) return { success: false, message: "ID категории не предоставлен." };

  const validated = categorySchema.partial().safeParse(values);

  if (!validated.success) {
    const errors = validated.error.flatten().fieldErrors;
    categoryLogger.error("Category update failed due to validation errors", { id, errors });
    return { success: false, message: "Неверные данные формы.", errors };
  }

  try {
    const { description, ...rest } = validated.data;
    const categoryData: Partial<CategoryUpdateInput> = {
        ...rest,
        description: description ?? null,
    };
    const result = await categoriesService.update(id, categoryData);

    if (result.success) {
      categoryLogger.info("Category updated successfully", { id });
      revalidateCategoryPaths(id);
    }

    return result;
  } catch (error) {
    categoryLogger.error("Unexpected error in updateCategoryAction", { error: error as Error, id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось обновить категорию." };
  }
}

export async function deleteCategoryAction(id: string) {
  if (!id) return { success: false, message: "ID категории не предоставлен." };

  try {
    const result = await categoriesService.delete(id);

    if (result.success) {
      categoryLogger.info("Category deleted successfully", { id });
      revalidateCategoryPaths();
    }

    return result;
  } catch (error) {
    categoryLogger.error("Unexpected error in deleteCategoryAction", { error: error as Error, id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось удалить категорию." };
  }
}
