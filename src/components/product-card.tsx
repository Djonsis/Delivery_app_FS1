

"use client";

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { Plus, Minus, Star } from "lucide-react";
import { logger } from "@/lib/logger";

const productCardLogger = logger.withCategory("PRODUCT_CARD");

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, getCartItem } = useCart();
  const cartItem = getCartItem(product.id);

  const getPrecision = (step: number) => {
    const stepStr = String(step);
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
  };

  const precision = getPrecision(product.step_quantity || 1);

  const handleQuantityChange = (newQuantity: number) => {
    productCardLogger.debug(`Handling quantity change for ${product.title}`, { newQuantity });
    if (newQuantity < 0) return;
    
    let roundedQuantity = parseFloat(newQuantity.toFixed(precision));

    if (roundedQuantity > 0 && roundedQuantity < product.min_order_quantity) {
      productCardLogger.debug(`Quantity ${roundedQuantity} is below min order ${product.min_order_quantity}. Setting to 0.`, { productId: product.id });
      updateQuantity(product, 0);
    } else {
      updateQuantity(product, roundedQuantity);
    }
  };
  
  const incrementQuantity = () => {
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const newQuantity = currentQuantity + (product.step_quantity || 1);
    productCardLogger.debug(`Incrementing quantity for ${product.title}`, { from: currentQuantity, to: newQuantity });
    if (currentQuantity === 0) {
      handleQuantityChange(product.min_order_quantity || 1);
    } else {
      handleQuantityChange(newQuantity);
    }
  };
  
  const decrementQuantity = () => {
    if (cartItem) {
      const newQuantity = cartItem.quantity - (product.step_quantity || 1);
       productCardLogger.debug(`Decrementing quantity for ${product.title}`, { from: cartItem.quantity, to: newQuantity });
      if (newQuantity >= (product.min_order_quantity || 1)) {
        handleQuantityChange(newQuantity);
      } else {
        updateQuantity(product, 0);
      }
    }
  };

  const displayedQuantity = cartItem?.quantity ? (cartItem.quantity.toFixed(precision)) : '0';

  const handleAddToCart = () => {
    productCardLogger.info(`Adding ${product.title} to cart.`, { product });
    addToCart(product);
  }

  const formatWeight = () => {
    if (!product.is_weighted) {
        return 'за шт.';
    }
    return `/ ${product.unit}`;
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg">
       <Link href={`/product/${product.id}`} className="flex flex-col flex-grow">
          <CardHeader className="p-0">
            <div className="relative aspect-[4/3] w-full overflow-hidden">
              <Image
                src={product.imageUrl}
                alt={product.title}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                data-ai-hint={product.category || ''}
              />
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-4">
            <CardTitle className="mt-1 text-lg font-semibold">{product.title}</CardTitle>
            <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-[#ffc247] fill-[#ffc247]" />
                    <span className="text-sm font-medium">{product.rating.toFixed(1)}</span>
                </div>
                <span className="text-xs text-muted-foreground">({product.reviews} отзывов)</span>
            </div>
            <div className="flex-grow" />
            <div className="mt-4 flex items-baseline justify-between">
              <p className="text-2xl font-bold text-primary">{Math.round(product.price)} ₽</p>
              <p className="text-sm text-muted-foreground">{formatWeight()}</p>
            </div>
          </CardContent>
      </Link>
      <CardFooter className="p-4 pt-0">
        {cartItem && cartItem.quantity > 0 ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={decrementQuantity}>
              <Minus className="h-4 w-4" />
            </Button>
             <div className="flex h-10 w-16 items-center justify-center rounded-md border border-input bg-background text-center font-bold">
              {displayedQuantity}
            </div>
            <Button variant="outline" size="icon" onClick={incrementQuantity}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
           <Button className="w-full" onClick={handleAddToCart}>
            В корзину
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
