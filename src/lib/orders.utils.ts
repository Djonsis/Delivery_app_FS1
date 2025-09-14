
import { ORDER_STATUSES, OrderStatus } from "./types";

/**
 * Checks if a given string is a valid OrderStatus.
 * @param status The string to validate.
 * @returns True if the status is a valid OrderStatus, otherwise false.
 */
export const validateOrderStatus = (status: string): status is OrderStatus => {
  return (ORDER_STATUSES as readonly string[]).includes(status);
};

/**
 * Checks if an order status is final (i.e., it cannot be changed).
 * @param status The order status to check.
 * @returns True if the status is final, otherwise false.
 */
export const isFinalStatus = (status: OrderStatus) => 
  status === "Выполнен" || status === "Отменен";

/**
 * A mapping of order statuses to their corresponding badge colors for UI consistency.
 */
export const statusColors: Record<OrderStatus, "default" | "secondary" | "destructive"> = {
    "Новый заказ": "secondary",
    "Собирается": "secondary",
    "Ожидает курьера": "secondary",
    "Передан в доставку": "secondary",
    "Выполнен": "default",
    "Отменен": "destructive",
};
