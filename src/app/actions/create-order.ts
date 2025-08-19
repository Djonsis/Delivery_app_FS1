"use server";

import { adminDb } from "@/lib/firebase-admin";
import { CartItem } from "@/lib/types";
import { serverLogger } from "@/lib/server-logger";

const orderLogger = serverLogger.withCategory("ORDER_ACTION");

interface CreateOrderPayload {
    customer: string;
    items: CartItem[];
    total: number;
}

export async function createOrder(payload: CreateOrderPayload) {
    orderLogger.info("Attempting to create a new order...", { customer: payload.customer, itemCount: payload.items.length });
    if (!payload.customer || !payload.items || payload.items.length === 0) {
        orderLogger.warn("Order creation failed due to missing data.", { customer: payload.customer, items: payload.items });
        throw new Error("Необходимы данные о клиенте и товарах в заказе.");
    }

    try {
        const orderData = {
            customer: payload.customer,
            items: payload.items.map(item => ({
                ...item,
                product: JSON.parse(JSON.stringify(item.product)), // Ensure product object is correctly serialized for Firestore
            })),
            total: payload.total,
            status: "Новый заказ",
            date: new Date(),
            lastUpdated: new Date(),
        };

        orderLogger.debug("Prepared order data for Firestore.", { total: orderData.total });

        const docRef = await adminDb.collection("orders").add(orderData);
        
        orderLogger.info(`Successfully created new order.`, { orderId: docRef.id });
        
        return { success: true, orderId: docRef.id };
    } catch (error) {
        orderLogger.error("Error creating order in Firestore", error as Error);
        throw new Error("Не удалось сохранить заказ в базе данных.");
    }
}
