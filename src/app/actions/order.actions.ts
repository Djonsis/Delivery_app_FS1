
"use server";

import { z } from "zod";
import { logger } from "@/lib/logger";
import { createOrder } from "@/lib/orders.service";

const orderActionLogger = logger.withCategory("ORDER_ACTION");

const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().min(0),
  unitPrice: z.number().min(0),
});

const createOrderSchema = z.object({
  customerName: z.string().min(1, "Имя покупателя обязательно."),
  items: z.array(orderItemSchema).min(1, "В заказе должна быть хотя бы одна позиция."),
  totalAmount: z.number().min(0),
});


export async function createOrderAction(values: unknown) {
  orderActionLogger.info("Attempting to validate create order payload...");
  const validatedFields = createOrderSchema.safeParse(values);

  if (!validatedFields.success) {
    const errorMessage = "Неверные данные для создания заказа.";
    orderActionLogger.error(errorMessage, { errors: validatedFields.error.flatten().fieldErrors });
    return { success: false, message: errorMessage };
  }
  
  try {
    orderActionLogger.info("Payload valid, calling createOrder service.", { data: validatedFields.data });
    const { orderId } = await createOrder(validatedFields.data);
    orderActionLogger.info("Successfully created order via service.", { orderId });
    
    return { success: true, message: "Заказ успешно создан.", orderId };
  } catch (error) {
    orderActionLogger.error("Failed to create order via service", error as Error);
    return { success: false, message: (error as Error).message || "Ошибка сервера. Не удалось создать заказ." };
  }
}
