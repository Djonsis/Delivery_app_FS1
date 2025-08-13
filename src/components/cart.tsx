"use client";

import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Minus, Plus, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { createOrder } from "@/app/actions/create-order";
import { useState, useTransition } from "react";

export function Cart() {
  const { cartItems, removeFromCart, updateQuantity, cartTotal, itemCount, clearCart } = useCart();
  const [isPending, startTransition] = useTransition();

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    startTransition(async () => {
        try {
            await createOrder({
                // Temporarily hardcoding customer name. We'll replace this with real user data later.
                customer: "Иван Петров",
                items: cartItems,
                total: cartTotal,
            });

            toast({
              title: "Заказ принят!",
              description: "Точную итоговую стоимость мы пришлем после сборки заказа.",
            });
            clearCart();
        } catch (error) {
            console.error("Failed to create order:", error);
            toast({
                title: "Ошибка",
                description: "Не удалось оформить заказ. Пожалуйста, попробуйте еще раз.",
                variant: "destructive",
            });
        }
    });
  };

  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
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
              {cartItems.map(({ product, quantity }) => {
                const precision = getPrecision(product.step_quantity);
                const displayedQuantity = quantity.toFixed(precision);

                return (
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
                          onClick={() => {
                            const newQuantity = parseFloat((quantity - product.step_quantity).toFixed(precision));
                            if (newQuantity > 0 && newQuantity < product.min_order_quantity) {
                                updateQuantity(product.id, 0);
                            } else {
                                updateQuantity(product.id, newQuantity)
                            }
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        <div className="flex h-7 w-12 items-center justify-center rounded-md border border-input bg-background text-center text-sm">
                            {displayedQuantity}
                        </div>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            const newQuantity = parseFloat((quantity + product.step_quantity).toFixed(precision));
                            updateQuantity(product.id, newQuantity)
                          }}
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
                )
              })}
            </div>
          </ScrollArea>
          <SheetFooter className="mt-6">
            <div className="flex w-full flex-col gap-4">
              <Separator />
              <div className="flex justify-between text-lg font-semibold">
                <span>Итого</span>
                <span>{Math.round(cartTotal)} ₽</span>
              </div>
              <Button size="lg" onClick={handleCheckout} disabled={isPending}>
                {isPending ? "Оформление..." : "Оформить заказ"}
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
