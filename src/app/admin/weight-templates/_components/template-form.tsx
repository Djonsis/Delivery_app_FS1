
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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeightTemplate } from "@/lib/types";
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { createWeightTemplateAction, updateWeightTemplateAction } from "../_actions/template.actions";
import { useRouter } from "next/navigation";


const templateFormSchema = z.object({
  name: z.string().min(3, "Название должно быть не менее 3 символов.").max(100, "Название не должно превышать 100 символов."),
  description: z.string().optional(),
  unit: z.enum(["kg", "g", "pcs"], { required_error: "Единица измерения обязательна."}),
  min_order_quantity: z.coerce.number().min(0.001, "Мин. заказ должен быть больше 0.").max(1000),
  step_quantity: z.coerce.number().min(0.001, "Шаг должен быть больше 0.").max(100),
  is_active: z.boolean().default(true),
}).refine(data => data.step_quantity <= data.min_order_quantity, {
  message: "Шаг количества не может быть больше минимального заказа.",
  path: ["step_quantity"],
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

interface TemplateFormProps {
  template?: WeightTemplate;
}

export default function TemplateForm({ template }: TemplateFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: template ? {
        ...template,
        description: template.description || "",
    } : {
      name: "",
      description: "",
      unit: "kg",
      min_order_quantity: 0.5,
      step_quantity: 0.1,
      is_active: true,
    },
  });

  const onSubmit = (values: TemplateFormValues) => {
    startTransition(async () => {
      let result;
      try {
        if (template) {
          result = await updateWeightTemplateAction(template.id, values);
        } else {
          result = await createWeightTemplateAction(values);
        }

        if (result.success) {
          toast({ title: "Успешно", description: result.message });
          router.push("/admin/weight-templates");
          router.refresh();
        } else {
          toast({ title: "Ошибка сохранения", description: result.message, variant: "destructive" });
          if ("errors" in result && result.errors) {
            const formErrors = result.errors as unknown as { [K in keyof TemplateFormValues]: string[] };
            for (const [field, messages] of Object.entries(formErrors)) {
              if (messages && messages.length > 0) {
                form.setError(field as keyof TemplateFormValues, {
                  type: "server",
                  message: messages.join(", "),
                });
              }
            }
          }
        }
      } catch (error) {
        toast({
          title: "Непредвиденная ошибка",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Название шаблона</FormLabel>
              <FormControl>
                <Input placeholder="например, Овощи (кг)" {...field} />
              </FormControl>
              <FormDescription>Короткое и понятное название для быстрого выбора.</FormDescription>
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
                <Textarea placeholder="Опишите, для каких товаров предназначен этот шаблон..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FormField
              control={form.control}
              name="unit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Единица измерения</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Выберите единицу" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kg">Килограмм (кг)</SelectItem>
                      <SelectItem value="g">Грамм (г)</SelectItem>
                      <SelectItem value="pcs">Штука (шт)</SelectItem>
                    </SelectContent>
                  </Select>
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
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormDescription>Минимальное количество для добавления в корзину.</FormDescription>
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
                    <Input type="number" step="any" {...field} />
                  </FormControl>
                  <FormDescription>Шаг для кнопок +/- в корзине.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
        </div>

        {template && (
           <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Статус</FormLabel>
                  <FormDescription>
                    Неактивные шаблоны не будут отображаться при создании нового товара.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
        
        <Button type="submit" disabled={isPending}>
          {isPending ? "Сохранение..." : (template ? "Обновить шаблон" : "Создать шаблон")}
        </Button>
      </form>
    </Form>
  );
}
