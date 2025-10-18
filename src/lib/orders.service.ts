import { query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import { Order, OrderStatus, CreateOrderPayload } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { mockOrder } from "./mock-data";
import { runMockOrReal } from "./env";
import { validateOrderStatus } from "./orders.utils";

const log = serverLogger.withCategory("ORDERS_SERVICE");

export const ordersService = {
    async getOrders(): Promise<Order[]> {
        return runMockOrReal(
            // Mock path
            () => {
                log.info("🎭 MOCK MODE: Returning mock orders");
                return Promise.resolve([mockOrder]);
            },
            // Real path
            async () => {
                log.info("💾 REAL MODE: Fetching orders from DB");
                const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
                log.debug(`Fetched ${rows.length} orders from DB`);
                return rows;
            }
        );
    },

    async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
        return runMockOrReal(
            // Mock path
            () => {
                log.info(`🎭 MOCK MODE: updateOrderStatus(${orderId}) to "${newStatus}"`);
                return Promise.resolve({ ...mockOrder, id: orderId, status: newStatus });
            },
            // Real path
            async () => {
                log.info(`💾 REAL MODE: Updating order ${orderId} to "${newStatus}"`);
                
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
                    
                    return result.rows[0];
                } catch (error) {
                    log.error(`Failed to update order ${orderId}`, error as Error);
                    throw new Error(`Database error. Could not update order status.`);
                }
            }
        );
    },

    async createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
        return runMockOrReal(
            // Mock path
            () => {
                log.info("🎭 MOCK MODE: createOrder() - generating mock order ID");
                return Promise.resolve({ orderId: `mock-order-${Date.now()}` });
            },
            // Real path
            async () => {
                const { customerName, items, totalAmount } = payload;
                log.info("💾 REAL MODE: Creating order in DB", { customerName, itemCount: items.length });
                
                await query('BEGIN');

                try {
                    const orderInsertQuery = `
                        INSERT INTO orders (customer_name, total_amount, status) 
                        VALUES ($1, $2, $3) 
                        RETURNING id`;
                    const orderResult = await query(orderInsertQuery, [customerName, totalAmount, 'Новый заказ']);
                    const newOrderId = orderResult.rows[0].id;
                    log.debug("Created entry in 'orders' table", { newOrderId });

                    const itemInsertQuery = `
                        INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
                        VALUES ($1, $2, $3, $4)`;
                    
                    for (const item of items) {
                        await query(itemInsertQuery, [newOrderId, item.productId, item.quantity, item.unitPrice]);
                    }
                    log.debug(`Inserted ${items.length} items into 'order_items' table`);

                    await query('COMMIT');
                    log.info("Successfully created order and committed transaction", { orderId: newOrderId });

                    revalidatePath('/admin/orders');
                    
                    return { orderId: newOrderId };

                } catch (error) {
                    await query('ROLLBACK');
                    log.error("Error creating order, rolling back transaction", error as Error);
                    throw new Error("Не удалось сохранить заказ в базе данных.");
                }
            }
        );
    }
};
