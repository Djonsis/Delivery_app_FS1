"use server";

import { adminDb } from "@/lib/firebase-admin";
import { OrderStatus } from "@/lib/types";
import { logger } from "@/lib/logger";

const orderStatusLogger = logger.withCategory("ORDER_STATUS_ACTION");


export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    orderStatusLogger.info(`Updating status for order ${orderId} to "${newStatus}"`);
    if (!orderId || !newStatus) {
        orderStatusLogger.warn("Update status failed due to missing arguments.", { orderId, newStatus });
        throw new Error("Необходим ID заказа и новый статус.");
    }

    try {
        const orderRef = adminDb.collection("orders").doc(orderId);
        
        const updatePayload = {
            status: newStatus,
            lastUpdated: new Date(),
        };
        
        await orderRef.update(updatePayload);
        
        orderStatusLogger.info(`Successfully updated status for order ${orderId}.`, { newStatus });

        // TODO: Add logic to send notification to Telegram bot here
        // For example:
        // if (newStatus === "Новый заказ") {
        //   await sendTelegramNotification(`Новый заказ #${orderId}!`);
        // }
        
        return { success: true, message: `Статус заказа #${orderId} обновлен.` };

    } catch (error) {
        orderStatusLogger.error(`Failed to update status for order ${orderId}`, error as Error);
        throw new Error("Не удалось обновить статус заказа в базе данных.");
    }
}
