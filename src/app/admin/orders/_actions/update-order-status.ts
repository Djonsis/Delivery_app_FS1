
"use server";

import { OrderStatus } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";
import { ordersService } from "@/lib/orders.service";

const orderStatusLogger = serverLogger.withCategory("ORDER_STATUS_ACTION");

export async function updateOrderStatusAction(orderId: string, newStatus: OrderStatus) {
    orderStatusLogger.info(`Action: Updating status for order ${orderId} to "${newStatus}"`);
    if (!orderId || !newStatus) {
        const message = "Необходим ID заказа и новый статус.";
        orderStatusLogger.warn(`Update status failed: ${message}`, { orderId, newStatus });
        return { success: false, message };
    }

    try {
        await ordersService.updateOrderStatus(orderId, newStatus);
        
        const message = `Статус заказа #${orderId} обновлен.`;
        orderStatusLogger.info(`Successfully updated status for order ${orderId} via service.`, { newStatus });
        
        return { success: true, message };

    } catch (error) {
        const message = "Не удалось обновить статус заказа в базе данных.";
        orderStatusLogger.error(`Failed to update status for order ${orderId} via service`, error as Error);
        return { success: false, message };
    }
}
