
"use server"

import { query } from "@/lib/db";
import { logger } from "@/lib/logger";
import { Order, OrderStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

const ordersServiceLogger = logger.withCategory("ORDERS_SERVICE");


export async function getOrders(): Promise<Order[]> {
    ordersServiceLogger.info("Fetching all orders from DB.");
    try {
        const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
        ordersServiceLogger.debug(`Found ${rows.length} orders.`);
        return rows;
    } catch (error) {
        ordersServiceLogger.error("Error fetching orders from DB", error as Error);
        throw new Error("Could not fetch orders.");
    }
}

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<void> {
    ordersServiceLogger.info(`Service: Updating status for order ${orderId} to "${newStatus}"`);
    try {
        const result = await query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2',
            [newStatus, orderId]
        );
        if (result.rowCount === 0) {
            throw new Error(`Order with ID ${orderId} not found.`);
        }
        revalidatePath('/admin/orders');
    } catch (error) {
        ordersServiceLogger.error(`Failed to update order status ${orderId} in DB`, error as Error);
        throw new Error(`Database error. Could not update order status ${orderId}.`);
    }
}
