
import { query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import { Order, OrderStatus, CreateOrderPayload } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { mockOrder } from "./mock-data";
import { runLocalOrDb, isLocal } from "./env";
import { validateOrderStatus } from "./orders.utils";

const ordersServiceLogger = serverLogger.withCategory("ORDERS_SERVICE");

export const ordersService = {
    async getOrders(): Promise<Order[]> {
        return runLocalOrDb(
            () => [mockOrder],
            async () => {
                ordersServiceLogger.info("Fetching all orders from DB.");
                const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
                ordersServiceLogger.debug(`Found ${rows.length} orders.`);
                return rows;
            }
        );
    },

    async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
        if (isLocal()) {
            ordersServiceLogger.warn(`Running in local/studio environment. Mocking updateOrderStatus for order: ${orderId}`);
            return { ...mockOrder, status: newStatus };
        }
        ordersServiceLogger.info(`Service: Updating status for order ${orderId} to "${newStatus}"`);
        
        if (!validateOrderStatus(newStatus)) {
            throw new Error(`Недопустимый статус заказа: ${newStatus}`);
        }
        
        try {
            const result = await query(
                'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [newStatus, orderId]
            );
            if (result.rowCount === 0) {
                throw new Error(`Заказ с ID ${orderId} не найден.`);
            }
            revalidatePath('/admin/orders');
            return result.rows[0];
        } catch (error) {
            ordersServiceLogger.error(`Failed to update order status ${orderId} in DB`, error as Error);
            throw new Error(`Database error. Could not update order status.`);
        }
    },

    async createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
        return runLocalOrDb(
            () => {
                ordersServiceLogger.warn(`Running in local/studio environment. Mocking createOrder.`);
                return { orderId: 'mock-order-id-123' };
            },
            async () => {
                const { customerName, items, totalAmount } = payload;
                ordersServiceLogger.info("Attempting to create a new order in DB", { customerName, itemCount: items.length });
                const client = await query('BEGIN');

                try {
                    const orderInsertQuery = `
                        INSERT INTO orders (customer_name, total_amount, status) 
                        VALUES ($1, $2, $3) 
                        RETURNING id`;
                    const orderResult = await query(orderInsertQuery, [customerName, totalAmount, 'Новый заказ']);
                    const newOrderId = orderResult.rows[0].id;
                    ordersServiceLogger.debug("Created entry in 'orders' table", { newOrderId });

                    const itemInsertQuery = `
                        INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
                        VALUES ($1, $2, $3, $4)`;
                    
                    for (const item of items) {
                        await query(itemInsertQuery, [newOrderId, item.productId, item.quantity, item.unitPrice]);
                    }
                    ordersServiceLogger.debug(`Inserted ${items.length} items into 'order_items' table`);

                    await query('COMMIT');
                    ordersServiceLogger.info("Successfully created new order and committed transaction.", { orderId: newOrderId });

                    revalidatePath('/admin/orders');
                    
                    return { orderId: newOrderId };

                } catch (error) {
                    await query('ROLLBACK');
                    ordersServiceLogger.error("Error creating order in DB transaction, rolling back.", error as Error);
                    throw new Error("Не удалось сохранить заказ в базе данных.");
                }
            }
        );
    }
};
