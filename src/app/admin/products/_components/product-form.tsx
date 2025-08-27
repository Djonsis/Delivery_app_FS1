
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
import { Product } from "@/lib/types";
import { useTransition, useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { createProductAction, updateProductAction } from "../_actions/product.actions";
import { getPresignedUrlAction } from "@/lib/actions/storage.actions";
import { publicConfig } from "@/lib/public-config";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/ui/combobox";

const productFormSchema = z.object({
  title: z.string().min(3, "Название должно содержать не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  category: z.string().optional(),
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
  const [categories, setCategories] = useState<{ value: string; label: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);


   useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/products/categories');
        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }
        const categoryNames: string[] = await res.json();
        setCategories(categoryNames.map(name => ({ value: name, label: name })));
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
      category: product.category || "",
      tags: product.tags?.join(", "),
      imageUrl: product.image_url || "",
    } : {
      title: "",
      description: "",
      price: 0,
      category: "",
      tags: "",
      imageUrl: "",
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };


  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      try {
        let imageUrl = product?.image_url;

        if (selectedFile) {
          setIsUploading(true);
          toast({ title: "Загрузка изображения...", description: "Пожалуйста, подождите." });

          const presignedUrlResult = await getPresignedUrlAction({
            filename: selectedFile.name,
            contentType: selectedFile.type,
          });

          if (!presignedUrlResult.success || !presignedUrlResult.url || !presignedUrlResult.objectKey) {
            throw new Error(presignedUrlResult.error || "Не удалось получить URL для загрузки.");
          }

          const response = await fetch(presignedUrlResult.url, {
            method: 'PUT',
            body: selectedFile,
            headers: { 'Content-Type': selectedFile.type },
          });

          if (!response.ok) {
            throw new Error('Ошибка при загрузке файла в хранилище.');
          }

          imageUrl = `${publicConfig.s3.publicUrl}/${presignedUrlResult.objectKey}`;
          
          setIsUploading(false);
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
                <div className="flex items-center gap-4">
                    <Input id="picture" type="file" onChange={handleFileChange} className="flex-1" accept="image/*"/>
                    {selectedFile && <span className="text-sm text-muted-foreground">{selectedFile.name}</span>}
                </div>
            </FormControl>
            <FormDescription>
                Загрузите изображение для вашего товара.
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
              name="category"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Категория</FormLabel>
                  <FormControl>
                     <Combobox
                        options={categories}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Выберите или создайте категорию..."
                        emptyMessage="Категории не найдены."
                    />
                  </FormControl>
                   <FormDescription>
                    Выберите существующую или введите новую.
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
