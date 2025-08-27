
export type WeightCategory = 'light' | 'middle' | 'heavy' | 'none';

// This represents the raw data for creating/updating a product
export interface ProductData {
  title: string;
  description?: string;
  price: number;
  categoryId?: string;
  tags?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  sku: string | null;
  name: string; // Will be mapped to 'title' from DB
  title: string;
  description: string | null;
  price: number;
  currency: string;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  category: string | null; // This is the category NAME joined from the categories table
  category_id: string | null; // The foreign key
  image_url: string | null; // Mapped to imageUrl
  imageUrl: string; // Ensure this is always a string for components
  rating: number;
  reviews: number;
  weight?: string;
  brand?: string;
  manufacturer?: string;
  weight_category: WeightCategory; // Not in DB yet
  min_order_quantity: number;
  step_quantity: number;
  nutrition?: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  } | null;
}

export interface CartItem {
  product: Product;
  quantity: number;
}


export interface Category {
  id: string;
  name: string;
  slug: string;
  sku_prefix: string;
  description: string | null;
  created_at: string;
  updated_at: string;
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
  user_id: string | null;
  customer_name: string;
  total_amount: number;
  status: OrderStatus;
  cancellation_reason: CancellationReason | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface CreateOrderPayload {
    customerName: string;
    items: {
        productId: string;
        quantity: number;
        unitPrice: number;
    }[];
    totalAmount: number;
}


// Status types
export interface DbStatus {
    host?: string;
    port?: number;
    user?: string;
    database?: string;
    totalCount: number;
    idleCount: number;
    waitingCount: number;
    connected: boolean;
    error?: string;
}

export interface StorageStatus {
    bucketName?: string;
    endpoint?: string;
    region?: string;
    accessKeyId?: string;
    connected: boolean;
    error?: string;
}
