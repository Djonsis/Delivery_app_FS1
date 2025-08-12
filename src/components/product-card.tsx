"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { useCart } from "@/hooks/use-cart";
import { Plus, Minus } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, getCartItem } = useCart();
  const cartItem = getCartItem(product.id);

  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
  };
  const precision = getPrecision(product.step_quantity);

  const handleQuantityChange = (newQuantity: number) => {
    const roundedQuantity = parseFloat(newQuantity.toFixed(precision));
    // Ensure quantity is not less than the minimum order quantity
    if (roundedQuantity < 0) return;
    if (roundedQuantity > 0 && roundedQuantity < product.min_order_quantity) {
      updateQuantity(product.id, product.min_order_quantity);
    } else {
      updateQuantity(product.id, roundedQuantity);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty input to let user type
    if (value === '') {
      updateQuantity(product.id, 0); // Or handle as you see fit
      return;
    }
    const quantity = parseFloat(value);
    if (!isNaN(quantity) && quantity >= 0) {
      updateQuantity(product.id, quantity); // Directly update, onBlur will handle final validation
    }
  };

  const incrementQuantity = () => {
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    if (currentQuantity === 0) {
      handleQuantityChange(product.min_order_quantity);
    } else {
      const newQuantity = currentQuantity + product.step_quantity;
      handleQuantityChange(newQuantity);
    }
  };
  
  const decrementQuantity = () => {
    if (cartItem) {
      const newQuantity = cartItem.quantity - product.step_quantity;
      if (newQuantity < product.min_order_quantity && newQuantity > 0) {
         updateQuantity(product.id, 0);
      } else {
         handleQuantityChange(newQuantity);
      }
    }
  };

  const displayedQuantity = cartItem?.quantity ? (cartItem.quantity.toFixed(precision)) : '0';

  return (
    <Card className="flex h-full flex-col overflow-hidden rounded-xl shadow-sm transition-shadow hover:shadow-lg">
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint={product.category}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-4">
        <p className="text-sm font-medium text-muted-foreground">{product.category}</p>
        <CardTitle className="mt-1 text-lg font-semibold">{product.name}</CardTitle>
        <div className="mt-2 flex items-center gap-2">
          <StarRating rating={product.rating} />
          <span className="text-xs text-muted-foreground">({product.reviews} отзывов)</span>
        </div>
        <CardDescription className="mt-2 flex-1 text-sm">{product.description}</CardDescription>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-2xl font-bold text-primary">{Math.round(product.price)} ₽</p>
          {product.weight && <p className="text-sm text-muted-foreground">{product.weight}</p>}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {cartItem && cartItem.quantity > 0 ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={decrementQuantity}>
              <Minus className="h-4 w-4" />
            </Button>
            <Input
                type="number"
                min="0"
                step={product.step_quantity}
                value={displayedQuantity}
                onChange={handleInputChange}
                onBlur={(e) => {
                  const quantity = parseFloat(e.target.value);
                  if (!isNaN(quantity)) {
                    handleQuantityChange(quantity);
                  } else {
                    updateQuantity(product.id, 0);
                  }
                }}
                className="w-16 text-center font-bold"
              />
            <Button variant="outline" size="icon" onClick={incrementQuantity}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
           <Button className="w-full" onClick={() => addToCart(product)}>
            Добавить в корзину
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
