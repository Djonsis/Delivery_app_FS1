
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { serverLogger } from "@/lib/server-logger";
import { weightTemplatesService } from "@/lib/weight-templates.service";

const templateActionLogger = serverLogger.withCategory("TEMPLATE_ACTION");

const templateSchema = z.object({
  name: z.string().min(3, "Название должно быть не менее 3 символов.").max(100, "Название не должно превышать 100 символов."),
  description: z.string().optional(),
  unit: z.enum(["kg", "g", "pcs"]),
  min_order_quantity: z.coerce.number().min(0.001, "Мин. заказ должен быть больше 0.").max(1000),
  step_quantity: z.coerce.number().min(0.001, "Шаг должен быть больше 0.").max(100),
  is_active: z.boolean().default(true),
}).refine(data => data.step_quantity <= data.min_order_quantity, {
  message: "Шаг количества не может быть больше минимального заказа.",
  path: ["step_quantity"],
});


export async function createTemplateAction(values: unknown) {
  const validatedFields = templateSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    templateActionLogger.error("Template creation failed due to validation errors", { errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }

  try {
    templateActionLogger.info("Attempting to create template via service", { data: validatedFields.data });
    await weightTemplatesService.create(validatedFields.data);
    templateActionLogger.info("Successfully created template.", { name: validatedFields.data.name });

    revalidatePath("/admin/weight-templates");
    revalidatePath("/admin/products/new");
    revalidatePath("/admin/products");

    return { success: true, message: "Шаблон успешно создан." };
  } catch (error) {
    templateActionLogger.error("Failed to create template via service", error as Error);
    return { success: false, message: "Ошибка базы данных. Не удалось создать шаблон." };
  }
}

export async function updateTemplateAction(id: string, values: unknown) {
  if (!id) {
    return { success: false, message: "ID шаблона не предоставлен." };
  }

  const validatedFields = templateSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessages = validatedFields.error.flatten().fieldErrors;
    templateActionLogger.error("Template update failed due to validation errors", { id, errors: errorMessages });
    return { success: false, message: "Неверные данные формы.", errors: errorMessages };
  }

  try {
    templateActionLogger.info("Attempting to update template via service", { id, data: validatedFields.data });
    await weightTemplatesService.update(id, validatedFields.data);
    templateActionLogger.info("Successfully updated template.", { id });
    
    revalidatePath("/admin/weight-templates");
    revalidatePath("/admin/products");

    return { success: true, message: "Шаблон успешно обновлен." };
  } catch (error) {
    templateActionLogger.error("Failed to update template via service", error as Error, { id });
    return { success: false, message: "Ошибка базы данных. Не удалось обновить шаблон." };
  }
}

export async function toggleTemplateStatusAction(id: string, currentStatus: boolean) {
    if (!id) {
        return { success: false, message: "ID шаблона не предоставлен." };
    }

    try {
        await weightTemplatesService.update(id, { is_active: !currentStatus });
        const message = `Шаблон успешно ${!currentStatus ? 'активирован' : 'деактивирован'}.`;
        templateActionLogger.info(message, { id });
        
        revalidatePath("/admin/weight-templates");
        return { success: true, message };

    } catch (error) {
        templateActionLogger.error("Failed to toggle template status", error as Error, { id });
        return { success: false, message: "Не удалось изменить статус шаблона." };
    }
}
