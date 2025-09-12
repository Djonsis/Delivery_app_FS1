
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { 
  createProduct,
  deleteProduct,
  updateProduct,
} from "@/lib/products.service";
import { serverLogger } from "@/lib/server-logger";

const productActionLogger = serverLogger.withCategory("PRODUCT_ACTION");

const productSchema = z.object({
  title: z.string().min(3, "Название должно быть не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  categoryId: z.string().uuid("Необходимо выбрать категорию.").optional(),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),

  // --- новые поля для весовых товаров ---
  is_weighted: z.boolean().default(false),
  unit: z.enum(["kg", "g", "pcs"]).default("pcs"),
  price_per_unit: z.coerce.number().min(0).optional(),
  price_unit: z.enum(["kg", "g", "pcs"]).optional(),
  min_order_quantity: z.coerce.number().min(0).default(1),
  step_quantity: z.coerce.number().min(0).default(1),
});

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    productActionLogger.error("Product creation failed due to validation errors", { errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    productActionLogger.info("Attempting to create product via service", { data: validatedFields.data });
    await createProduct(validatedFields.data);
    productActionLogger.info("Successfully created product.", { title: validatedFields.data.title });
    
    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return { success: true, message: "Товар успешно создан." };
  } catch (error) {
    productActionLogger.error("Failed to create product via service", error as Error);
    return { success: false, message: "Ошибка базы данных. Не удалось создать товар." };
  }
}


export async function updateProductAction(id: string, values: unknown) {
  if (!id) {
    return { success: false, message: "ID товара не предоставлен." };
  }
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    productActionLogger.error("Product update failed due to validation errors", { id, errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    productActionLogger.info("Attempting to update product via service", { id, data: validatedFields.data });
    await updateProduct(id, validatedFields.data);
    productActionLogger.info("Successfully updated product.", { id });
    
    revalidatePath("/admin/products");
    revalidatePath(`/admin/products/${id}/edit`);
    revalidatePath(`/product/${id}`);
    revalidatePath("/catalog");

    return { success: true, message: "Товар успешно обновлен." };
  } catch (error) {
    productActionLogger.error("Failed to update product via service", error as Error, { id });
    return { success: false, message: "Ошибка базы данных. Не удалось обновить товар." };
  }
}


export async function deleteProductAction(id: string) {
  if (!id) {
    return { success: false, message: "ID товара не предоставлен." };
  }
  
  try {
    productActionLogger.info("Attempting to delete product via service", { id });
    await deleteProduct(id);
    productActionLogger.info("Successfully deleted product.", { id });

    revalidatePath("/admin/products");
    revalidatePath("/catalog");

    return { success: true, message: "Товар успешно удален." };
  } catch (error) {
    productActionLogger.error("Failed to delete product via service", error as Error, { id });
    return { success: false, message: "Ошибка базы данных. Не удалось удалить товар." };
  }
}
