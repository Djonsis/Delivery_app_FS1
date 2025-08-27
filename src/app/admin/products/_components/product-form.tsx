
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Product, Category } from "@/lib/types";
import { useTransition, useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { createProductAction, updateProductAction } from "../_actions/product.actions";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/ui/combobox";
import { uploadImageAction } from "@/lib/actions/storage.actions";
import { getAllCategories } from "@/lib/categories.service";

const productFormSchema = z.object({
  title: z.string().min(3, "Название должно содержать не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  categoryId: z.string({ required_error: "Необходимо выбрать категорию." }).uuid("Необходимо выбрать категорию."),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
}

export default function ProductForm({ product }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);


   useEffect(() => {
    async function fetchCategories() {
      try {
        const fetchedCategories = await getAllCategories();
        setCategories(fetchedCategories);
      } catch (error) {
        console.error(error);
        toast({
            title: "Ошибка",
            description: "Не удалось загрузить список категорий.",
            variant: "destructive"
        })
      }
    }
    fetchCategories();
  }, [toast]);


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? {
      title: product.title,
      description: product.description || "",
      price: product.price,
      categoryId: product.category_id || undefined,
      tags: product.tags?.join(", "),
      imageUrl: product.image_url || "",
    } : {
      title: "",
      description: "",
      price: 0,
      tags: "",
      imageUrl: "",
    },
  });


  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      try {
        const file = fileInputRef.current?.files?.[0];
        let imageUrl = product?.image_url || values.imageUrl;

        if (file) {
          setIsUploading(true);
          toast({ title: "Загрузка изображения...", description: "Пожалуйста, подождите." });

          const formData = new FormData();
          formData.append("file", file);
          
          const uploadResult = await uploadImageAction(formData);

          setIsUploading(false);

          if (!uploadResult.success || !uploadResult.imageUrl) {
            throw new Error(uploadResult.error || "Не удалось загрузить изображение.");
          }
          imageUrl = uploadResult.imageUrl;
        }

        const finalValues = { ...values, imageUrl };
        
        let result;
        if (product) {
          result = await updateProductAction(product.id, finalValues);
        } else {
          result = await createProductAction(finalValues);
        }

        if (result.success) {
            toast({ title: "Успешно", description: result.message });
            router.push("/admin/products");
        } else {
            throw new Error(result.message);
        }

      } catch (error) {
        setIsUploading(false);
        toast({
          title: "Ошибка",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    });
  };

  const isSubmitDisabled = isPending || isUploading;
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название</FormLabel>
              <FormControl>
                <Input placeholder="например, Свежие органические помидоры" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Описание</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Опишите товар..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

         <FormItem>
            <FormLabel>Изображение</FormLabel>
             <FormControl>
                <Input id="picture" type="file" ref={fileInputRef} className="flex-1" accept="image/*"/>
            </FormControl>
            <FormDescription>
                Загрузите изображение для вашего товара. Если оставить пустым, будет использовано старое.
            </FormDescription>
            <FormMessage />
        </FormItem>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Цена (в руб.)</FormLabel>
                <FormControl>
                    <Input type="number" step="0.01" placeholder="99.99" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Категория</FormLabel>
                  <FormControl>
                     <Combobox
                        options={categoryOptions}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Выберите категорию..."
                        emptyMessage="Категории не найдены."
                        allowCreation={false}
                    />
                  </FormControl>
                   <FormDescription>
                    Выберите существующую категорию.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>
         <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Теги</FormLabel>
              <FormControl>
                <Input placeholder="например, органика, свежий, летний" {...field} />
              </FormControl>
              <FormDescription>
                Значения, разделенные запятыми.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isSubmitDisabled}>
          {isPending ? "Сохранение..." : (isUploading ? "Загрузка..." : (product ? "Обновить товар" : "Создать товар"))}
        </Button>
      </form>
    </Form>
  );
}
