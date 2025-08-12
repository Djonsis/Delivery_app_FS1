"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StarRating } from "@/components/star-rating";
import { useCart } from "@/hooks/use-cart";
import { Plus, Minus } from "lucide-react";
import { useState, useEffect } from "react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, updateQuantity, getCartItem } = useCart();
  const cartItem = getCartItem(product.id);
  const [inputValue, setInputValue] = useState<string>('');

  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
  };
  const precision = getPrecision(product.step_quantity);

  useEffect(() => {
    if (cartItem) {
      setInputValue(cartItem.quantity.toFixed(precision));
    } else {
      setInputValue('');
    }
  }, [cartItem, precision]);


  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 0) return;
    
    let roundedQuantity = parseFloat(newQuantity.toFixed(precision));

    if (roundedQuantity > 0 && roundedQuantity < product.min_order_quantity) {
      updateQuantity(product.id, product.min_order_quantity);
    } else {
      updateQuantity(product.id, roundedQuantity);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Allow only numbers and one separator (dot or comma)
    value = value.replace(/[^0-9.,]/g, '').replace(',', '.');
    
    // Ensure only one dot
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }

    if (value.includes('.') && parts[1]?.length > precision) {
      value = parseFloat(value).toFixed(precision);
    }

    setInputValue(value);
  };

  const handleInputBlur = () => {
    let quantity = parseFloat(inputValue);
    if (!isNaN(quantity)) {
      handleQuantityChange(quantity);
    } else {
      if (cartItem) {
        setInputValue(cartItem.quantity.toFixed(precision));
      } else {
        setInputValue('');
      }
    }
  };
  
  const incrementQuantity = () => {
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    if (currentQuantity === 0) {
      handleQuantityChange(product.min_order_quantity);
    } else {
      const newQuantity = parseFloat((currentQuantity + product.step_quantity).toFixed(precision));
      handleQuantityChange(newQuantity);
    }
  };
  
  const decrementQuantity = () => {
    if (cartItem) {
      const newQuantity = parseFloat((cartItem.quantity - product.step_quantity).toFixed(precision));
      if (newQuantity > 0 && newQuantity < product.min_order_quantity) {
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
                type="text"
                inputMode="decimal"
                min="0"
                value={inputValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
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
