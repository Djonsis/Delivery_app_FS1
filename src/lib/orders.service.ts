
"use server"

import { getClient, query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import { Order, OrderStatus, CreateOrderPayload } from "@/lib/types";
import { revalidatePath } from "next/cache";

const ordersServiceLogger = serverLogger.withCategory("ORDERS_SERVICE");


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

export async function createOrder(payload: CreateOrderPayload): Promise<{ orderId: string }> {
    const { customerName, items, totalAmount } = payload;
    ordersServiceLogger.info("Attempting to create a new order in DB", { customerName, itemCount: items.length });
    const client = await getClient();

    try {
        await client.query('BEGIN'); // Start transaction

        // Insert into orders table
        const orderInsertQuery = `
            INSERT INTO orders (customer_name, total_amount, status) 
            VALUES ($1, $2, $3) 
            RETURNING id`;
        const orderResult = await client.query(orderInsertQuery, [customerName, totalAmount, 'Новый заказ']);
        const newOrderId = orderResult.rows[0].id;
        ordersServiceLogger.debug("Created entry in 'orders' table", { newOrderId });

        // Insert into order_items table
        const itemInsertQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
            VALUES ($1, $2, $3, $4)`;
        
        for (const item of items) {
            await client.query(itemInsertQuery, [newOrderId, item.productId, item.quantity, item.unitPrice]);
        }
        ordersServiceLogger.debug(`Inserted ${items.length} items into 'order_items' table`);

        await client.query('COMMIT'); // Commit transaction
        ordersServiceLogger.info("Successfully created new order and committed transaction.", { orderId: newOrderId });

        revalidatePath('/admin/orders'); // Revalidate admin page to show new order
        
        return { orderId: newOrderId };

    } catch (error) {
        await client.query('ROLLBACK'); // Rollback transaction on error
        ordersServiceLogger.error("Error creating order in DB transaction, rolling back.", error as Error);
        throw new Error("Не удалось сохранить заказ в базе данных.");
    } finally {
        client.release();
    }
}
