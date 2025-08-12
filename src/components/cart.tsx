"use client";

import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function Cart() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, itemCount } = useCart();

  const handleCheckout = () => {
    toast({
      title: "Оформление заказа",
      description: "Ваш заказ был размещен и ожидает подтверждения.",
    });
  };

  return (
    <>
      <SheetHeader>
        <SheetTitle>Корзина ({itemCount})</SheetTitle>
      </SheetHeader>
      <Separator className="my-4" />
      {cartItems.length > 0 ? (
        <div className="flex h-full flex-col justify-between">
          <ScrollArea className="flex-1 pr-4">
            <div className="flex flex-col gap-6">
              {cartItems.map(({ product, quantity }) => (
                <div key={product.id} className="flex items-center gap-4">
                  <div className="relative h-20 w-20 overflow-hidden rounded-md">
                    <Image
                      src={product.imageUrl}
                      alt={product.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {Math.round(product.price)} ₽
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(product.id, quantity - product.step_quantity)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        value={quantity}
                        onChange={(e) => updateQuantity(product.id, parseFloat(e.target.value) || 0)}
                        className="h-7 w-12 text-center"
                        step={product.step_quantity}
                        min={0}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(product.id, quantity + product.step_quantity)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground"
                    onClick={() => removeFromCart(product.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
          <SheetFooter className="mt-6">
            <div className="flex w-full flex-col gap-4">
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого</span>
                <span>{Math.round(cartTotal)} ₽</span>
              </div>
              <Button size="lg" onClick={handleCheckout}>
                Оформить заказ
              </Button>
            </div>
          </SheetFooter>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-4">
          <p className="text-muted-foreground">Ваша корзина пуста.</p>
        </div>
      )}
    </>
  );
}
