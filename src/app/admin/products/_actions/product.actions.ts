
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { productsService } from "@/lib/products";
import { serverLogger } from "@/lib/server-logger";
import { weightTemplatesService } from "@/lib/weight-templates.service";
import { ProductCreateInput, ProductUpdateInput } from "@/lib/types";

const productActionLogger = serverLogger.withCategory("PRODUCT_ACTION");

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
    else revalidatePath("/admin/products/new");
}

export async function createProductAction(values: unknown) {
  const validatedFields = productSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    productActionLogger.error("Product creation failed due to validation errors", { errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }
  
  try {
    const { categoryId, tags, ...rest } = validatedFields.data;

    const productData: ProductCreateInput = {
        ...rest,
        category_id: categoryId,
        tags: tags ? tags.split(',').map(t => t.trim()) : [],
        description: rest.description ?? null,
        imageUrl: rest.imageUrl ?? null,
        weight_template_id: rest.weight_template_id ?? null,
        price_per_unit: rest.price_per_unit ?? null,
        price_unit: rest.price_unit ?? null,
        currency: 'RUB', 
        rating: 0, 
        reviews: 0, 
    };
    
    if (productData.is_weighted && productData.weight_template_id) {
      const templateResult = await weightTemplatesService.getById(productData.weight_template_id);
      if (templateResult) {
        productData.unit = productData.unit || templateResult.unit;
        productData.min_order_quantity = productData.min_order_quantity ?? templateResult.min_order_quantity;
        productData.step_quantity = productData.step_quantity ?? templateResult.step_quantity;
      }
    }
    
    productActionLogger.info("Attempting to create product via service", { data: productData });
    const result = await productsService.create(productData);

    if (result.success) {
        productActionLogger.info("Successfully created product.", { title: result.product?.title, id: result.product?.id });
        revalidateProductPaths();
    }

    return result;

  } catch (error) {
    productActionLogger.error("An unexpected error occurred in createProductAction", error as Error);
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось создать товар." };
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
    const { categoryId, tags, ...rest } = validatedFields.data;

    const productData: ProductUpdateInput = {
        ...rest,
        category_id: categoryId,
        tags: tags ? tags.split(',').map(t => t.trim()) : undefined, 
        description: rest.description ?? null,
        imageUrl: rest.imageUrl ?? null,
        weight_template_id: rest.weight_template_id ?? null,
        price_per_unit: rest.price_per_unit ?? null,
        price_unit: rest.price_unit ?? null,
    };
    
    if (productData.is_weighted && productData.weight_template_id) {
      const templateResult = await weightTemplatesService.getById(productData.weight_template_id);
      if (templateResult) {
        productData.unit = productData.unit || templateResult.unit;
        productData.min_order_quantity = productData.min_order_quantity ?? templateResult.min_order_quantity;
        productData.step_quantity = productData.step_quantity ?? templateResult.step_quantity;
      }
    } else if (productData.is_weighted === false) {
        productData.weight_template_id = null;
    }
    
    productActionLogger.info("Attempting to update product via service", { id, data: productData });
    const result = await productsService.update(id, productData);

    if(result.success) {
        productActionLogger.info("Successfully updated product.", { id });
        revalidateProductPaths(id);
    }
    
    return result;

  } catch (error) {
    productActionLogger.error("An unexpected error occurred in updateProductAction", error as Error, { id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось обновить товар." };
  }
}


export async function deleteProductAction(id: string) {
  if (!id) {
    return { success: false, message: "ID товара не предоставлен." };
  }
  
  try {
    productActionLogger.info("Attempting to delete product via service", { id });
    const result = await productsService.delete(id);

    if(result.success) {
        productActionLogger.info("Successfully deleted product.", { id });
        revalidateProductPaths();
    }

    return result;
    
  } catch (error) {
    productActionLogger.error("An unexpected error occurred in deleteProductAction", error as Error, { id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось удалить товар." };
  }
}
