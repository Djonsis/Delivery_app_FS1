"use client";

import Link from "next/link";
import { FastBasketIcon, UserProfileIcon, CatalogIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Cart } from "@/components/cart";
import { Input } from "./ui/input";
import { Search } from "lucide-react";


export default function SiteHeader() {
  const { cartTotal } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center gap-4">
        <Link href="/" className="mr-2 flex items-center space-x-2">
          <FastBasketIcon className="h-6 w-6 text-primary" />
          <span className="hidden font-bold sm:inline-block">БыстраяКорзина</span>
        </Link>
        
        <div className="hidden md:flex">
             <Link href="/catalog">
                <Button>
                    <CatalogIcon className="mr-2 h-5 w-5" />
                    Каталог
                </Button>
            </Link>
        </div>

        <div className="relative hidden flex-1 md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Искать продукты..."
            className="w-full rounded-full pl-10"
          />
        </div>

        <div className="flex items-center justify-end space-x-4">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <ShoppingCart className="h-5 w-5" />
                {cartTotal > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -right-4 -top-2 h-auto w-auto justify-center rounded-full px-2 py-0.5 text-xs"
                  >
                    {Math.round(cartTotal)} ₽
                  </Badge>
                )}
                <span className="sr-only">Открыть корзину</span>
              </Button>
            </SheetTrigger>
            <SheetContent className="flex w-full flex-col sm:max-w-md">
              <Cart />
            </SheetContent>
          </Sheet>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    <UserProfileIcon className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <span className="sr-only">Меню пользователя</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Мой аккаунт</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link href="/profile">
                <DropdownMenuItem>Профиль</DropdownMenuItem>
              </Link>
              <Link href="/admin/orders">
                <DropdownMenuItem>Заказы</DropdownMenuItem>
              </Link>
              <DropdownMenuItem>Настройки</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Выйти</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
       <div className="container pb-4 md:hidden">
         <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Искать продукты..."
                className="w-full rounded-full pl-10"
            />
         </div>
       </div>
    </header>
  );
}
