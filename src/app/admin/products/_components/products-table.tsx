
"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Product } from "@/lib/types";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { deleteProductAction } from "../_actions/product.actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProductsTableProps {
  products: Product[];
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleDeleteProduct = (id: string) => {
    startTransition(async () => {
      const result = await deleteProductAction(id);
      if (result.success) {
        toast({
          title: "Успех!",
          description: result.message,
        });
      } else {
        toast({
          title: "Ошибка",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Изображение</span>
            </TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Артикул</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead className="hidden md:table-cell">Дата создания</TableHead>
            <TableHead>
              <span className="sr-only">Действия</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="hidden sm:table-cell">
                <Image
                  alt={product.title}
                  className="aspect-square rounded-md object-cover"
                  height="64"
                  src={product.imageUrl}
                  width="64"
                />
              </TableCell>
              <TableCell className="font-medium">{product.title}</TableCell>
              <TableCell>
                <Badge variant="secondary">{product.sku || 'N/A'}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline">Активен</Badge>
              </TableCell>
              <TableCell>{product.price} {product.currency}</TableCell>
              <TableCell className="hidden md:table-cell">
                {new Date(product.created_at).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Открыть меню</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Действия</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <Link href={`/admin/products/${product.id}/edit`}>
                        <DropdownMenuItem>Редактировать</DropdownMenuItem>
                      </Link>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/10">
                          Удалить
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы абсолютно уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Это действие нельзя отменить. Товар будет помечен как
                        удаленный и больше не будет отображаться в каталоге.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDeleteProduct(product.id)}
                        disabled={isPending}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {isPending ? "Удаление..." : "Удалить"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {products.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Товары не найдены.</p>
        </div>
      )}
    </>
  );
}
