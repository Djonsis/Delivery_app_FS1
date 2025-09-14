
"use client";

import { useTransition } from "react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { WeightTemplate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { toggleTemplateStatusAction } from "../_actions/template.actions";

interface TemplatesTableProps {
  templates: WeightTemplate[];
}

export default function TemplatesTable({ templates }: TemplatesTableProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    startTransition(async () => {
      const result = await toggleTemplateStatusAction(id, currentStatus);
      if (result.success) {
        toast({ title: "Успех!", description: result.message });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Название</TableHead>
            <TableHead>Ед. изм.</TableHead>
            <TableHead>Мин. заказ</TableHead>
            <TableHead>Шаг</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead><span className="sr-only">Действия</span></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {templates.map((template) => (
            <TableRow key={template.id}>
              <TableCell className="font-medium">{template.name}</TableCell>
              <TableCell>{template.unit}</TableCell>
              <TableCell>{template.min_order_quantity}</TableCell>
              <TableCell>{template.step_quantity}</TableCell>
              <TableCell>
                <Badge variant={template.is_active ? "secondary" : "outline"}>
                  {template.is_active ? "Активен" : "Неактивен"}
                </Badge>
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
                      <Link href={`/admin/weight-templates/${template.id}/edit`}>
                        <DropdownMenuItem>Редактировать</DropdownMenuItem>
                      </Link>
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem>
                          {template.is_active ? "Деактивировать" : "Активировать"}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {template.is_active
                          ? "Шаблон станет неактивным и не будет отображаться при создании новых товаров. Существующие товары не изменятся."
                          : "Шаблон снова станет доступен для выбора при создании товаров."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleToggleStatus(template.id, template.is_active)}
                        disabled={isPending}
                      >
                        {isPending ? "Выполнение..." : "Продолжить"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {templates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Шаблоны не найдены.</p>
        </div>
      )}
    </>
  );
}
