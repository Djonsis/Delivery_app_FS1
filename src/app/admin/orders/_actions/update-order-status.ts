"use server";

import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { OrderStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
  if (!orderId || !newStatus) {
    throw new Error("Необходим ID заказа и новый статус.");
  }

  try {
    const orderRef = doc(db, "orders", orderId);
    
    await updateDoc(orderRef, {
      status: newStatus,
      lastUpdated: serverTimestamp(),
    });

    // TODO: Add logic to send notification to Telegram bot here
    // For example:
    // if (newStatus === "Новый заказ") {
    //   await sendTelegramNotification(`Новый заказ #${orderId}!`);
    // }

    revalidatePath("/admin/orders");
    
    return { success: true, message: `Статус заказа #${orderId} обновлен.` };

  } catch (error) {
    console.error("Ошибка при обновлении статуса заказа: ", error);
    // You might want to throw a more specific error or return a detailed error object
    throw new Error("Не удалось обновить статус заказа в базе данных.");
  }
}
