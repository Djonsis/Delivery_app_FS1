import { query } from "@/lib/db";
import { serverLogger } from "@/lib/server-logger";
import type { Order, OrderStatus, CreateOrderPayload } from "@/lib/types";
import { revalidatePath } from "next/cache";
import { validateDbRows, validateDbRow } from "@/lib/utils/validate-db-row";
import { DbOrderSchema } from "./schemas/order.schema";
import { mapDbRowToOrder } from "./orders/helpers";

const log = serverLogger.withCategory("ORDERS_SERVICE");

async function getAll(): Promise<Order[]> {
    log.info("Fetching orders from DB");
    try {
        const { rows } = await query('SELECT * FROM orders ORDER BY created_at DESC');
        log.debug(`Fetched ${rows.length} raw orders from DB`);

        const validatedRows = validateDbRows(rows, DbOrderSchema, "getAllOrders", { skipInvalid: true });
        return validatedRows.map(mapDbRowToOrder);

    } catch (error) {
        log.error("Database error in getAll()", { error });
        throw error;
    }
}

async function getById(id: string): Promise<Order | null> {
    log.info("Fetching order by ID", { id });
    try {
        const { rows } = await query('SELECT * FROM orders WHERE id = $1', [id]);
        if (rows.length === 0) return null;

        const validatedRow = validateDbRow(rows[0], DbOrderSchema, "getOrderById");
        return mapDbRowToOrder(validatedRow);

    } catch (error) {
        log.error("Database error in getById()", { id, error });
        throw error;
    }
}

async function updateStatus(orderId: string, newStatus: OrderStatus): Promise<Order> {
    log.info(`Updating order ${orderId} to "${newStatus}"`);
    
    try {
        const { rows } = await query(
            'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [newStatus, orderId]
        );
        if (rows.length === 0) {
            throw new Error(`Заказ с ID ${orderId} не найден.`);
        }
        
        const validatedRow = validateDbRow(rows[0], DbOrderSchema, "updateOrderStatus");
        return mapDbRowToOrder(validatedRow);

    } catch (error) {
        log.error(`Failed to update order ${orderId}`, error as Error);
        throw new Error(`Database error. Could not update order status.`);
    }
}

async function create(payload: CreateOrderPayload): Promise<Order> {
    const { customerName, items, totalAmount } = payload;
    log.info("Creating order in DB", { customerName, itemCount: items.length });
    
    await query('BEGIN');

    try {
        const orderInsertQuery = `
            INSERT INTO orders (customer_name, total_amount, status) 
            VALUES ($1, $2, $3) 
            RETURNING *`;
        const orderResult = await query(orderInsertQuery, [customerName, totalAmount, 'Новый заказ']);
        const newOrderRaw = orderResult.rows[0];
        log.debug("Created entry in 'orders' table", { newOrderId: newOrderRaw.id });

        const itemInsertQuery = `
            INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
            VALUES ($1, $2, $3, $4)`;
        
        for (const item of items) {
            await query(itemInsertQuery, [newOrderRaw.id, item.productId, item.quantity, item.unitPrice]);
        }
        log.debug(`Inserted ${items.length} items into 'order_items' table`);

        await query('COMMIT');
        log.info("Successfully created order and committed transaction", { orderId: newOrderRaw.id });

        revalidatePath('/admin/orders');

        const validatedOrder = validateDbRow(newOrderRaw, DbOrderSchema, "createOrder");
        return mapDbRowToOrder(validatedOrder);

    } catch (error) {
        await query('ROLLBACK');
        log.error("Error creating order, rolling back transaction", error as Error);
        throw new Error("Не удалось сохранить заказ в базе данных.");
    }
}

export const ordersService = {
    getAll,
    getById,
    updateStatus,
    create,
};

export type OrdersService = typeof ordersService;
