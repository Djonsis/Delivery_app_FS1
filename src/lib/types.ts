
export type Role = {
  id: number;
  name: string;
};

export type User = {
  id: string;
  email: string;
  display_name: string | null;
  auth_provider: string;
  created_at: string;
  updated_at: string;
  roles?: Role[];
};

export type WeightCategory = 'light' | 'middle' | 'heavy' | 'none';

// Унифицированный тип единиц измерения
export type UnitType = "kg" | "g" | "pcs";


// This represents the raw data for creating/updating a product
export interface ProductData {
  title: string;
  description?: string;
  price: number;
  categoryId?: string;
  tags?: string;
  imageUrl?: string;
}

export interface NutritionInfo {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
}

export interface Product {
  id: string;
  sku: string | null;
  title: string;
  description: string | null;
  price: number;
  currency: string;
  tags: readonly string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;

  category: string;
  category_id: string | null;

  imageUrl: string;

  rating: number;
  reviews: number;

  // --- Весовые товары ---\
  is_weighted: boolean;
  unit: UnitType;
  weight_category?: WeightCategory;

  min_order_quantity: number;
  step_quantity: number;

  price_per_unit?: number;
  price_unit?: UnitType;

  // Доп. атрибуты
  brand?: string;
  manufacturer?: string;
  nutrition?: NutritionInfo;

  weight_template_id?: string;
}

export type ProductCreateInput = Omit<Product, 'id' | 'created_at' | 'updated_at' | 'deleted_at' | 'category' | 'sku' | 'tags'> & {
  category_id: string;
  tags: string[];
};

export type ProductUpdateInput = Partial<ProductCreateInput>;

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

export type CategoryCreateInput = Omit<Category, 'id' | 'created_at' | 'updated_at' | 'slug'>;
export type CategoryUpdateInput = Partial<CategoryCreateInput>;

export interface WeightTemplate {
  id: string;
  name: string;
  description?: string | null;
  unit: UnitType;
  min_order_quantity: number;
  step_quantity: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type WeightTemplateCreateInput = Omit<WeightTemplate, 'id' | 'created_at' | 'updated_at' | 'is_active'>;
export type WeightTemplateUpdateInput = Partial<WeightTemplateCreateInput> & { is_active?: boolean };


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

// Product Filtering and Sorting
export type SortOption = "popularity" | "price_desc" | "price_asc" | "rating_desc" | "discount_desc";

export interface ProductFilter {
    query?: string;
    categoryId?: string; 
    minPrice?: number;
    maxPrice?: number;
    sort?: SortOption;
    limit?: number;
    offset?: number;
}
