"use client";

import { createContext, useReducer, ReactNode } from "react";
import type { Product, CartItem } from "@/lib/types";

interface CartState {
  cartItems: CartItem[];
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { id: string; quantity: number } };

const initialState: CartState = {
  cartItems: [],
};

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_TO_CART': {
      const product = action.payload;
      const existingItem = state.cartItems.find(item => item.product.id === product.id);
      if (existingItem) {
        return {
          ...state,
          cartItems: state.cartItems.map(item =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      return {
        ...state,
        cartItems: [...state.cartItems, { product, quantity: 1 }],
      };
    }
    case 'REMOVE_FROM_CART': {
      return {
        ...state,
        cartItems: state.cartItems.filter(item => item.product.id !== action.payload),
      };
    }
    case 'UPDATE_QUANTITY': {
        const { id, quantity } = action.payload;
        if (quantity <= 0) {
            return {
                ...state,
                cartItems: state.cartItems.filter(item => item.product.id !== id),
            };
        }
        return {
            ...state,
            cartItems: state.cartItems.map(item =>
            item.product.id === id ? { ...item, quantity } : item
            ),
        };
    }
    default:
      return state;
  }
}

export const CartContext = createContext<{
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  getCartItem: (id: string) => CartItem | undefined;
  itemCount: number;
  cartTotal: number;
}>({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  getCartItem: () => undefined,
  itemCount: 0,
  cartTotal: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addToCart = (product: Product) => dispatch({ type: 'ADD_TO_CART', payload: product });
  const removeFromCart = (id: string) => dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  const updateQuantity = (id: string, quantity: number) => dispatch({ type: 'UPDATE_QUANTITY', payload: { id, quantity } });
  
  const getCartItem = (id: string) => state.cartItems.find(item => item.product.id === id);

  const itemCount = state.cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = state.cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems: state.cartItems, addToCart, removeFromCart, updateQuantity, getCartItem, itemCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}
