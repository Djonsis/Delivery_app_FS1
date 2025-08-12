"use client";

import Image from "next/image";
import type { Product } from "@/lib/types";
import { Button } from "@/components/ui/button";
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
          <span className="text-xs text-muted-foreground">({product.reviews} reviews)</span>
        </div>
        <CardDescription className="mt-2 flex-1 text-sm">{product.description}</CardDescription>
        <div className="mt-4 flex items-baseline justify-between">
          <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>
          {product.weight && <p className="text-sm text-muted-foreground">{product.weight}</p>}
        </div>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        {cartItem ? (
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="outline" size="icon" onClick={() => updateQuantity(product.id, cartItem.quantity - 1)}>
              <Minus className="h-4 w-4" />
            </Button>
            <span className="text-lg font-bold">{cartItem.quantity}</span>
            <Button variant="outline" size="icon" onClick={() => updateQuantity(product.id, cartItem.quantity + 1)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={() => addToCart(product)}>
            Add to Cart
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
