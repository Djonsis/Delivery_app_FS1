
"use client";

import { useCart } from '@/hooks/use-cart';
import { logger } from '@/lib/logger';
import { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Plus, Minus } from 'lucide-react';

interface AddToCartWidgetProps {
    product: Product;
}

const productPageLogger = logger.withCategory("ADD_TO_CART_WIDGET");

export default function AddToCartWidget({ product }: AddToCartWidgetProps) {
  const { addToCart, updateQuantity, getCartItem } = useCart();
  const cartItem = product ? getCartItem(product.id) : undefined;
  
  if (!product) {
      return null;
  }

  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
  };
  const precision = getPrecision(product.step_quantity);

  const incrementQuantity = () => {
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const newQuantity = parseFloat((currentQuantity + product.step_quantity).toFixed(precision));
    productPageLogger.debug(`Incrementing quantity for ${product.name}`, { from: currentQuantity, to: newQuantity });
    if (currentQuantity === 0) {
      updateQuantity(product, product.min_order_quantity);
    } else {
      updateQuantity(product, newQuantity);
    }
  };
  
  const decrementQuantity = () => {
    if (cartItem) {
      const newQuantity = parseFloat((cartItem.quantity - product.step_quantity).toFixed(precision));
      productPageLogger.debug(`Decrementing quantity for ${product.name}`, { from: cartItem.quantity, to: newQuantity });
      if (newQuantity >= product.min_order_quantity) {
        updateQuantity(product, newQuantity);
      } else {
        updateQuantity(product, 0);
      }
    }
  };

  const handleAddToCart = () => {
    productPageLogger.info(`Adding ${product.name} to cart from product page`, { product });
    addToCart(product);
  }

  const displayedQuantity = cartItem?.quantity ? (cartItem.quantity.toFixed(precision)) : '0';


  return cartItem && cartItem.quantity > 0 ? (
    <div className="flex w-full items-center justify-between gap-2">
        <Button variant="outline" size="lg" className="flex-1" onClick={decrementQuantity}>
            <Minus className="h-5 w-5" />
        </Button>
        <div className="flex h-11 min-w-24 items-center justify-center rounded-md border border-input bg-background text-center text-xl font-bold">
            {displayedQuantity}
        </div>
        <Button variant="outline" size="lg" className="flex-1" onClick={incrementQuantity}>
            <Plus className="h-5 w-5" />
        </Button>
    </div>
    ) : (
    <Button size="lg" className="w-full" onClick={handleAddToCart}>
        Добавить в корзину
    </Button>
    );
}
