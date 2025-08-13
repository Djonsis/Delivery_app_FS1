export type WeightCategory = 'light' | 'middle' | 'heavy' | 'none';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  imageUrl: string;
  rating: number;
  reviews: number;
  description: string;
  weight?: string;
  weight_category: WeightCategory; // "light", "middle", "heavy", or "none" for non-weighted
  min_order_quantity: number;
  step_quantity: number;
  // New fields for product detail page
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  brand?: string;
  manufacturer?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export const ORDER_STATUSES = [
  "Новый заказ",
  "Собирается",
  "Ожидает курьера",
  "Передан в доставку",
  "Выполнен",
  "Отменен",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const CANCELLATION_REASONS = [
  "отмена клиентом",
  "клиент недоступен",
  "сбой у курьера",
  "сбой у магазина",
] as const;

export type CancellationReason = (typeof CANCELLATION_REASONS)[number];


export interface Order {
  id: string;
  customer: string;
  date: string;
  total: number;
  status: OrderStatus;
  cancellationReason?: CancellationReason;
  items: CartItem[];
}
