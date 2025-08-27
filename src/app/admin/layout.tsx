
"use client"

import {
  SidebarProvider,
  Sidebar,
  SidebarTrigger,
  SidebarInset,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  FastBasketIcon
} from "@/components/icons";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserProfileIcon } from "@/components/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ListOrdered, LayoutDashboard, Settings, FileText, Package, Database, Folder } from "lucide-react";


export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-background text-foreground">
        <Sidebar>
          <SidebarHeader>
             <div className="flex items-center gap-2">
                <FastBasketIcon className="h-6 w-6 text-primary" />
                <span className="text-lg font-semibold">БыстраяКорзина</span>
              </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                 <Link href="/admin">
                  <SidebarMenuButton tooltip="Главная">
                    <LayoutDashboard />
                    Главная
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/admin/products">
                  <SidebarMenuButton tooltip="Товары">
                    <Package />
                    Товары
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/admin/categories">
                  <SidebarMenuButton tooltip="Категории">
                    <Folder />
                    Категории
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/admin/orders">
                  <SidebarMenuButton tooltip="Заказы">
                    <ListOrdered />
                    Заказы
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <Link href="/admin/logs">
                  <SidebarMenuButton tooltip="Логи">
                    <FileText />
                    Логи
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
               <SidebarMenuItem>
                <Link href="/admin/status">
                  <SidebarMenuButton tooltip="Статус системы">
                    <Database />
                    Статус
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
             <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton tooltip="Настройки">
                  <Settings />
                  Настройки
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>
        <SidebarInset className="flex flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center justify-between gap-4 border-b bg-background px-4 sm:px-6">
              <div className="flex items-center gap-2">
                 <SidebarTrigger className="md:hidden" />
                 <h1 className="text-xl font-semibold">Админ-панель</h1>
              </div>

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
                <DropdownMenuItem>Профиль</DropdownMenuItem>
                <DropdownMenuItem>Заказы</DropdownMenuItem>
                <DropdownMenuItem>Настройки</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Выйти</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </header>
          <main className="flex-1 overflow-auto p-4 sm:p-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
