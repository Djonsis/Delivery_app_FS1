'use server';

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { weightTemplatesService } from "@/lib/weight-templates.service";
import { serverLogger } from "@/lib/server-logger";

const templateLogger = serverLogger.withCategory("WEIGHT_TEMPLATE_ACTION");

const templateSchema = z.object({
  name: z.string().min(2, "Название шаблона должно содержать не менее 2 символов."),
  unit: z.enum(["kg", "g", "pcs"]),
  min_order_quantity: z.number().min(0),
  step_quantity: z.number().min(0),
});

function revalidateTemplatePaths(id?: string) {
  revalidatePath("/admin/weight-templates");
  if (id) revalidatePath(`/admin/weight-templates/${id}/edit`);
    else revalidatePath("/admin/weight-templates/new");
}

export async function createWeightTemplateAction(values: unknown) {
  const validated = templateSchema.safeParse(values);

  if (!validated.success) {
    const errors = validated.error.flatten().fieldErrors;
    templateLogger.error("Weight template creation failed due to validation errors", { errors });
    return { success: false, message: "Неверные данные формы.", errors };
  }

  try {
    const result = await weightTemplatesService.create(validated.data);

    if (result.success) {
      templateLogger.info("Weight template created successfully", { id: result.template?.id, name: result.template?.name });
      revalidateTemplatePaths();
    }

    return result;
  } catch (error) {
    templateLogger.error("Unexpected error in createWeightTemplateAction", error as Error);
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось создать шаблон." };
  }
}

export async function updateWeightTemplateAction(id: string, values: unknown) {
  if (!id) return { success: false, message: "ID шаблона не предоставлен." };

  const validated = templateSchema.safeParse(values);

  if (!validated.success) {
    const errors = validated.error.flatten().fieldErrors;
    templateLogger.error("Weight template update failed due to validation errors", { id, errors });
    return { success: false, message: "Неверные данные формы.", errors };
  }

  try {
    const result = await weightTemplatesService.update(id, validated.data);

    if (result.success) {
      templateLogger.info("Weight template updated successfully", { id });
      revalidateTemplatePaths(id);
    }

    return result;
  } catch (error) {
    templateLogger.error("Unexpected error in updateWeightTemplateAction", error as Error, { id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось обновить шаблон." };
  }
}

export async function deleteWeightTemplateAction(id: string) {
  if (!id) return { success: false, message: "ID шаблона не предоставлен." };

  try {
    const result = await weightTemplatesService.delete(id);

    if (result.success) {
      templateLogger.info("Weight template deleted successfully", { id });
      revalidateTemplatePaths();
    }

    return result;
  } catch (error) {
    templateLogger.error("Unexpected error in deleteWeightTemplateAction", error as Error, { id });
    return { success: false, message: "Произошла непредвиденная ошибка. Не удалось удалить шаблон." };
  }
}
