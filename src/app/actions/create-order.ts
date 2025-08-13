"use server";

import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CartItem } from "@/lib/types";

interface CreateOrderPayload {
    customer: string;
    items: CartItem[];
    total: number;
}

export async function createOrder(payload: CreateOrderPayload) {
    if (!payload.customer || !payload.items || payload.payload.items.length === 0) {
        throw new Error("Необходимы данные о клиенте и товарах в заказе.");
    }

    try {
        const orderData = {
            customer: payload.customer,
            items: payload.items.map(item => ({
                ...item,
                 // Ensure product is a plain object
                product: JSON.parse(JSON.stringify(item.product)),
            })),
            total: payload.total,
            status: "Новый заказ",
            date: serverTimestamp(),
            lastUpdated: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, "orders"), orderData);
        
        return { success: true, orderId: docRef.id };
    } catch (error) {
        console.error("Ошибка при создании заказа: ", error);
        throw new Error("Не удалось сохранить заказ в базе данных.");
    }
}
