
"use client";

import { createContext, useReducer, ReactNode } from "react";
import type { Product, CartItem } from "@/lib/types";
import { logger } from "@/lib/logger";

const cartLogger = logger.withCategory("CART_CONTEXT");

interface CartState {
  cartItems: CartItem[];
}

type CartAction =
  | { type: 'ADD_TO_CART'; payload: Product }
  | { type: 'REMOVE_FROM_CART'; payload: string }
  | { type: 'UPDATE_QUANTITY'; payload: { product: Product, quantity: number } }
  | { type: 'CLEAR_CART' };


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
              ? { ...item, quantity: item.quantity + product.step_quantity }
              : item
          ),
        };
      } else {
        return {
          ...state,
          cartItems: [...state.cartItems, { product, quantity: product.min_order_quantity }],
        };
      }
    }
    case 'REMOVE_FROM_CART': {
      const productId = action.payload;
      return {
        ...state,
        cartItems: state.cartItems.filter(item => item.product.id !== productId),
      };
    }
    case 'UPDATE_QUANTITY': {
        const { product, quantity } = action.payload;
        const productId = product.id;

        if (quantity <= 0) {
            return {
                ...state,
                cartItems: state.cartItems.filter(item => item.product.id !== productId),
            };
        } else {
            const isItemInCart = state.cartItems.some(item => item.product.id === productId);

            if (isItemInCart) {
                return {
                    ...state,
                    cartItems: state.cartItems.map(item =>
                        item.product.id === productId ? { ...item, quantity } : item
                    ),
                };
            } else {
                 return {
                    ...state,
                    cartItems: [...state.cartItems, { product, quantity }],
                };
            }
        }
    }
    case 'CLEAR_CART': {
        return {
            ...state,
            cartItems: [],
        }
    }
    default:
      return state;
  }
}

export const CartContext = createContext<{
  cartItems: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (product: Product, quantity: number) => void;
  clearCart: () => void;
  getCartItem: (id: string) => CartItem | undefined;
  itemCount: number;
  cartTotal: number;
}>({
  cartItems: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getCartItem: () => undefined,
  itemCount: 0,
  cartTotal: 0,
});

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const addToCart = (product: Product) => {
    cartLogger.info(`Adding product to cart: ${product.name}`, { productId: product.id });
    dispatch({ type: 'ADD_TO_CART', payload: product });
  }
  const removeFromCart = (id: string) => {
    cartLogger.info(`Removing product from cart: ${id}`);
    dispatch({ type: 'REMOVE_FROM_CART', payload: id });
  }
  const updateQuantity = (product: Product, quantity: number) => {
    cartLogger.info(`Updating quantity for product: ${product.id}`, { newQuantity: quantity });
    dispatch({ type: 'UPDATE_QUANTITY', payload: { product, quantity } });
  }
  const clearCart = () => {
    cartLogger.info("Clearing cart.");
    dispatch({ type: 'CLEAR_CART' });
  }
  
  const getCartItem = (id: string) => state.cartItems.find(item => item.product.id === id);

  const itemCount = state.cartItems.reduce((sum, item) => sum + 1, 0);
  const cartTotal = state.cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <CartContext.Provider value={{ cartItems: state.cartItems, addToCart, removeFromCart, updateQuantity, clearCart, getCartItem, itemCount, cartTotal }}>
      {children}
    </CartContext.Provider>
  );
}
