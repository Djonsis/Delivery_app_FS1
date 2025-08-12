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
}

export interface CartItem {
  product: Product;
  quantity: number;
}
