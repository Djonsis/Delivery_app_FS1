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
}

export interface CartItem {
  product: Product;
  quantity: number;
}
