
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { productsService } from "@/lib/products";
import { serverLogger } from "@/lib/server-logger";
import { weightTemplatesService } from "@/lib/weight-templates.service";
import { ProductCreateInput, ProductUpdateInput, UnitType } from "@/lib/types";

const productActionLogger = serverLogger.withCategory("PRODUCT_ACTION");

// Базовая схема без refine
const baseProductSchema = z.object({
  title: z.string().min(3, "Название должно содержать не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  categoryId: z.string({ required_error: "Необходимо выбрать категорию." }).uuid("Необходимо выбрать категорию."),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),
  is_weighted: z.boolean().default(false),
  weight_template_id: z.string().uuid().optional().nullable(),
  unit: z.enum(["kg", "g", "pcs"] as [UnitType, ...UnitType[]]),
  price_per_unit: z.coerce.number().min(0).optional(),
  price_unit: z.enum(["kg", "g", "pcs"] as [UnitType, ...UnitType[]]).optional(),
  min_order_quantity: z.coerce.number().min(0).default(1),
  step_quantity: z.coerce.number().min(0).default(1),
});

// Схема с refine для создания
const productSchema = baseProductSchema.refine((data) => {
  if (!data.is_weighted) return true;
  if (data.weight_template_id) return true;
  return data.unit && data.min_order_quantity !== undefined && data.step_quantity !== undefined;
}, {
  message: "При ручной настройке весового товара необходимо заполнить все поля: ед. изм., мин. заказ и шаг.",
  path: ["weight_template_id"],
});

function revalidateProductPaths(id?: string) {
  revalidatePath("/admin/products");
  revalidatePath("/catalog");
  if (id) revalidatePath(`/admin/products/${id}/edit`);
  else revalidatePath("/admin/products/new");
}

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    const { categoryId, tags, ...rest } = validatedFields.data;

    const productData: ProductCreateInput = {
        ...rest,
        category_id: categoryId,
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : [],
        description: rest.description ?? null,
        imageUrl: rest.imageUrl ?? '',
        weight_template_id: rest.weight_template_id ?? undefined,
        price_per_unit: rest.price_per_unit ?? undefined,
        price_unit: rest.price_unit ?? undefined,
        currency: 'RUB', 
        rating: 0, 
        reviews: 0, 
    };
    
    const result = await productsService.create(productData);

    if (result.success) {
      revalidateProductPaths();
    }

    return result;

  } catch (error) {
    productActionLogger.error("Error in createProductAction", { error: error as Error });
    return { success: false, message: "Произошла непредвиденная ошибка." };
  }
}

export async function updateProductAction(id: string, values: unknown) {
  if (!id) return { success: false, message: "ID товара не предоставлен." };
  
  // Используем baseProductSchema.partial() для обновления
  const validatedFields = baseProductSchema.partial().safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    const { categoryId, tags, weight_template_id, ...rest } = validatedFields.data;

    const productData: ProductUpdateInput = {
        ...rest,
        weight_template_id: weight_template_id ?? undefined,
        ...(categoryId && { category_id: categoryId }),
        tags: tags ? tags.split(',').map((t: string) => t.trim()) : undefined, 
    };

    if (productData.is_weighted === false) {
        productData.weight_template_id = undefined;
    }
    
    const result = await productsService.update(id, productData);

    if(result.success) {
      revalidateProductPaths(id);
    }
    
    return result;

  } catch (error) {
    productActionLogger.error("Error in updateProductAction", { error: error as Error });
    return { success: false, message: "Произошла непредвиденная ошибка." };
  }
}

export async function deleteProductAction(id: string) {
  if (!id) return { success: false, message: "ID товара не предоставлен." };
  
  try {
    const result = await productsService.delete(id);

    if(result.success) {
      revalidateProductPaths();
    }

    return result;
    
  } catch (error) {
    productActionLogger.error("Error in deleteProductAction", { error: error as Error });
    return { success: false, message: "Произошла непредвиденная ошибка." };
  }
}
