
"use client";

import { useForm, Controller } from "react-hook-form";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Product, Category, WeightTemplate } from "@/lib/types";
import { useTransition, useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { createProductAction, updateProductAction } from "../_actions/product.actions";
import { useRouter } from "next/navigation";
import { Combobox } from "@/components/ui/combobox";
import { uploadImageAction } from "@/lib/actions/storage.actions";

const productFormSchema = z.object({
  title: z.string().min(3, "Название должно содержать не менее 3 символов."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Цена должна быть положительным числом."),
  categoryId: z.string({ required_error: "Необходимо выбрать категорию." }).uuid("Необходимо выбрать категорию."),
  tags: z.string().optional(),
  imageUrl: z.string().optional(),
  
  is_weighted: z.boolean().default(false),
  weight_template_id: z.string().uuid().optional().nullable(),
  unit: z.enum(["kg", "g", "pcs"]),
  price_per_unit: z.coerce.number().min(0).optional(),
  price_unit: z.enum(["kg", "g", "pcs"]).optional(),
  min_order_quantity: z.coerce.number().min(0).default(1),
  step_quantity: z.coerce.number().min(0).default(1),
}).refine((data) => {
  if (!data.is_weighted) return true; 
  if (data.weight_template_id) return true;
  return data.unit && data.min_order_quantity !== undefined && data.step_quantity !== undefined;
}, {
  message: "При ручной настройке весового товара необходимо заполнить все поля: ед. изм., мин. заказ и шаг.",
  path: ["weight_template_id"] 
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
  categories: Category[];
  weightTemplates: WeightTemplate[];
}

export default function ProductForm({ product, categories, weightTemplates }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? {
      title: product.title,
      description: product.description || "",
      price: product.price,
      categoryId: product.category_id || undefined,
      tags: product.tags?.join(", "),
      imageUrl: product.imageUrl || "",
      is_weighted: product.is_weighted,
      weight_template_id: product.weight_template_id || "",
      unit: product.unit || "pcs",
      price_per_unit: product.price_per_unit || undefined,
      price_unit: product.price_unit || undefined,
      min_order_quantity: product.min_order_quantity || 1,
      step_quantity: product.step_quantity || 1,
    } : {
      title: "",
      description: "",
      price: 0,
      tags: "",
      imageUrl: "",
      is_weighted: false,
      weight_template_id: "",
      unit: "pcs",
      min_order_quantity: 1,
      step_quantity: 1,
    },
  });

  useEffect(() => {
    if (product?.weight_template_id && !weightTemplates.some(t => t.id === product.weight_template_id)) {
        toast({
            title: "Шаблон неактивен",
            description: "Шаблон, ранее примененный к этому товару, был деактивирован. Все настройки сохранены в товаре.",
            variant: "destructive"
        });
    }
  }, [toast, product, weightTemplates]);

  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      let result;
      try {
        const file = fileInputRef.current?.files?.[0];
        let imageUrl = values.imageUrl;

        if (file) {
          setIsUploading(true);
          toast({ title: "Загрузка изображения..." });
          const formData = new FormData();
          formData.append("file", file);
          const uploadResult = await uploadImageAction(formData);
          setIsUploading(false);

          if (!uploadResult.success || !uploadResult.imageUrl) {
            toast({ title: "Ошибка загрузки", description: uploadResult.error, variant: "destructive" });
            return;
          }
          imageUrl = uploadResult.imageUrl;
        }

        const finalValues = { ...values, imageUrl };
        
        if (product) {
          result = await updateProductAction(product.id, finalValues);
        } else {
          result = await createProductAction(finalValues);
        }

        if (result.success) {
            toast({ title: "Успешно", description: result.message });
            router.push("/admin/products");
        } else {
            toast({ title: "Ошибка сохранения", description: result.message, variant: "destructive" });
            if ("errors" in result && result.errors) {
              const formErrors = result.errors as unknown as { [K in keyof ProductFormValues]: string[] };
              for (const [field, messages] of Object.entries(formErrors)) {
                 if (messages && messages.length > 0) {
                    form.setError(field as keyof ProductFormValues, {
                        type: "server",
                        message: messages.join(", "),
                    });
                 }
              }
            }
        }
      } catch (error) {
        setIsUploading(false);
        toast({ title: "Непредвиденная ошибка", description: (error as Error).message, variant: "destructive" });
      }
    });
  };
  
  const handleTemplateChange = (templateId: string) => {
    const newTemplateId = templateId === "manual" ? "" : templateId;
    
    if (newTemplateId) {
      const template = weightTemplates.find(t => t.id === newTemplateId);
      if (template) {
        form.setValue('unit', template.unit);
        form.setValue('min_order_quantity', template.min_order_quantity);
        form.setValue('step_quantity', template.step_quantity);
        toast({
          title: "Шаблон применен",
          description: `Настройки из шаблона "${template.name}" применены. Вы можете их переопределить.`,
        });
      }
    }
  };

  const isWeighted = form.watch("is_weighted");
  const selectedTemplateId = form.watch("weight_template_id");
  const isSubmitDisabled = isPending || isUploading;
  const categoryOptions = categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            {product?.sku && (
                <FormItem>
                    <FormLabel>Артикул (SKU)</FormLabel>
                    <FormControl>
                        <Input readOnly disabled value={product.sku} />
                    </FormControl>
                    <FormDescription>
                        Артикул генерируется автоматически и не может быть изменен.
                    </FormDescription>
                </FormItem>
            )}
        </div>
        
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
            <FormItem className="flex flex-col">
              <FormLabel>Категория</FormLabel>
              <Controller
                name="categoryId"
                control={form.control}
                render={({ field }) => (
                  <Combobox
                    options={categoryOptions}
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Выберите категорию..."
                    emptyMessage="Категории не найдены."
                    allowCreation={false}
                  />
                )}
              />
              <FormDescription>
                Выберите существующую категорию.
              </FormDescription>
              <FormMessage />
            </FormItem>
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

        <FormField
          control={form.control}
          name="is_weighted"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Весовой товар
                </FormLabel>
                <FormDescription>
                  Если включено, появятся дополнительные поля для настройки веса и цены за единицу.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        {isWeighted && (
          <>
            <FormItem>
              <FormLabel>Шаблон весового товара</FormLabel>
              <Controller
                control={form.control}
                name="weight_template_id"
                render={({ field }) => (
                  <Select 
                    value={field.value ?? ""} 
                    onValueChange={(value) => {
                      const templateId = value === "manual" ? "" : value;
                      field.onChange(templateId);
                      handleTemplateChange(templateId);
                  }}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите шаблон или настройте вручную" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manual">Настроить вручную</SelectItem>
                      {weightTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{template.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {template.unit} • мин: {template.min_order_quantity} • шаг: {template.step_quantity}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FormDescription>
                Выберите готовый шаблон для быстрой настройки или оставьте пустым для ручной настройки.
              </FormDescription>
              <FormMessage />
            </FormItem>

            <div className="grid grid-cols-2 gap-8 p-4 border rounded-md">
              {selectedTemplateId && (
                <div className="col-span-2 mb-4">
                  <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                    <span className="text-sm text-muted-foreground">
                      Используется шаблон: <span className="font-medium">
                        {weightTemplates.find(t => t.id === selectedTemplateId)?.name}
                      </span>
                    </span>
                  </div>
                </div>
              )}
              
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Единица измерения</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите единицу" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="kg">кг</SelectItem>
                        <SelectItem value="g">г</SelectItem>
                        <SelectItem value="pcs">шт</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="price_per_unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Цена за единицу</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any"
                        {...field}
                        value={field.value ?? ""}
                        onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="min_order_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Минимальный заказ</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="step_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Шаг количества</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="any" 
                        {...field}
                        onChange={e => field.onChange(parseFloat(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        
        <Button type="submit" disabled={isSubmitDisabled}>
          {isPending ? "Сохранение..." : (isUploading ? "Загрузка..." : (product ? "Обновить товар" : "Создать товар"))}
        </Button>
      </form>
    </Form>
  );
}
