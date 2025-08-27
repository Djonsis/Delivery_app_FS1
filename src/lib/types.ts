
export type WeightCategory = 'light' | 'middle' | 'heavy' | 'none';

export interface Product {
  id: string;
  name: string; // Will be mapped to 'title' from DB
  title: string;
  description: string;
  price: number;
  currency: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category: string; // Will need to ensure this is populated
  imageUrl: string; 
  rating: number; // Not in DB yet, will be mocked
  reviews: number; // Not in DB yet, will be mocked
  weight?: string; // Not in DB yet
  weight_category: WeightCategory; // Not in DB yet
  min_order_quantity: number; // Not in DB yet
  step_quantity: number; // Not in DB yet
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
  brand?: string; // Not in DB yet
  manufacturer?: string; // Not in DB yet
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
  date: any; // Using `any` to accommodate both string and Timestamp
  total: number;
  status: OrderStatus;
  cancellationReason?: CancellationReason;
  items: CartItem[];
  lastUpdated?: any;
}
