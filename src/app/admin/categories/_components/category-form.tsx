
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Category } from "@/lib/types";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { createCategoryAction, updateCategoryAction } from "../_actions/category.actions";


const categoryFormSchema = z.object({
  name: z.string().min(2, "Название должно быть не менее 2 символов."),
  sku_prefix: z.string().min(1, "Префикс обязателен.").max(10, "Префикс не должен превышать 10 символов."),
  description: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

interface CategoryFormProps {
  category?: Category;
}

export default function CategoryForm({ category }: CategoryFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category ? {
      name: category.name,
      sku_prefix: category.sku_prefix,
      description: category.description || "",
    } : {
      name: "",
      sku_prefix: "",
      description: "",
    },
  });


  const onSubmit = (values: CategoryFormValues) => {
    startTransition(async () => {
      try {
        let result;
        if (category) {
          result = await updateCategoryAction(category.id, values);
        } else {
          result = await createCategoryAction(values);
        }

        if (result.success) {
            toast({ title: "Успешно", description: result.message });
            router.push("/admin/categories");
        } else {
            throw new Error(result.message);
        }

      } catch (error) {
        toast({
          title: "Ошибка",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Название</FormLabel>
                <FormControl>
                    <Input placeholder="например, Овощи и фрукты" {...field} />
                </FormControl>
                 <FormDescription>
                    Основное название категории.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={form.control}
            name="sku_prefix"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Префикс артикула (SKU)</FormLabel>
                <FormControl>
                    <Input placeholder="например, ОВ" {...field} />
                </FormControl>
                 <FormDescription>
                    Короткий уникальный код для генерации артикулов.
                </FormDescription>
                <FormMessage />
                </FormItem>
            )}
            />
        </div>
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Опишите категорию..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохранение..." : (category ? "Обновить категорию" : "Создать категорию")}
        </Button>
      </form>
    </Form>
  );
}
