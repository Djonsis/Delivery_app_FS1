
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { productsService } from "@/lib/products.service";
import { serverLogger } from "@/lib/server-logger";
import { weightTemplatesService } from "@/lib/weight-templates.service";

const productActionLogger = serverLogger.withCategory("PRODUCT_ACTION");

// Схема валидации Zod остается той же, она надежна.
const productSchema = z.object({
  title: z.string().min(3, "Название должно содержать не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  categoryId: z.string({ required_error: "Необходимо выбрать категорию." }).uuid("Необходимо выбрать категорию."),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),
  
  is_weighted: z.boolean().default(false),
  weight_template_id: z.string().uuid().optional().nullable(),
  unit: z.enum(["kg", "g", "pcs"]),
  price_per_unit: z.coerce.number().min(0).optional(),
  price_unit: z.enum(["kg", "g", "pcs"]).optional(),
  min_order_quantity: z.coerce.number().min(0).default(1),
  step_quantity: z.coerce.number().min(0).default(1),
}).refine((data) => {
  if (!data.is_weighted) {
    return true; 
  }
  
  if (data.weight_template_id) {
    return true;
  }
  
  const hasManualFields = data.unit && 
                           data.min_order_quantity !== undefined && 
                           data.step_quantity !== undefined;

  return hasManualFields;
}, {
  message: "При ручной настройке весового товара необходимо заполнить все поля: ед. изм., мин. заказ и шаг.",
  path: ["weight_template_id"] 
});

function revalidateProductPaths(id?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  if (id) revalidatePath(`/admin/products/${id}/edit`);
  revalidatePath("/admin/products/new");
}

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    productActionLogger.error("Product creation failed due to validation errors", { errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    let productData = { ...validatedFields.data };
    
    if (productData.weight_template_id && productData.is_weighted) {
      const template = await weightTemplatesService.getById(productData.weight_template_id);
      if (template) {
        productData.unit = productData.unit || template.unit;
        productData.min_order_quantity = productData.min_order_quantity ?? template.min_order_quantity;
        productData.step_quantity = productData.step_quantity ?? template.step_quantity;
      }
    }
    
    productActionLogger.info("Attempting to create product via service", { data: productData });
    const newProduct = await productsService.create(productData);
    productActionLogger.info("Successfully created product.", { title: newProduct.title, id: newProduct.id });
    
    revalidateProductPaths();

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
    let productData = { ...validatedFields.data };
    
    if (productData.weight_template_id && productData.is_weighted) {
      const template = await weightTemplatesService.getById(productData.weight_template_id);
      if (template) {
        productData.unit = productData.unit || template.unit;
        productData.min_order_quantity = productData.min_order_quantity ?? template.min_order_quantity;
        productData.step_quantity = productData.step_quantity ?? template.step_quantity;
      }
    } else if (!productData.is_weighted) {
        productData.weight_template_id = null;
    }
    
    productActionLogger.info("Attempting to update product via service", { id, data: productData });
    await productsService.update(id, productData);
    productActionLogger.info("Successfully updated product.", { id });
    
    revalidateProductPaths(id);

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
    await productsService.delete(id);
    productActionLogger.info("Successfully deleted product.", { id });

    revalidateProductPaths();

    return { success: true, message: "Товар успешно удален." };
  } catch (error) {
    productActionLogger.error("Failed to delete product via service", error as Error, { id });
    return { success: false, message: "Ошибка базы данных. Не удалось удалить товар." };
  }
}
