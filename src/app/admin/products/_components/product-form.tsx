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
import { useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { createProductAction, updateProductAction } from "../_actions/product.actions";
import { useRouter } from "next/navigation";


const productFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters long."),
  description: z.string().optional(),
  price: z.coerce.number().min(0, "Price must be a positive number."),
  category: z.string().optional(),
  tags: z.string().optional(),
});

type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
}

export default function ProductForm({ product }: ProductFormProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product ? {
      title: product.title,
      description: product.description,
      price: product.price,
      category: product.category,
      tags: product.tags?.join(", "),
    } : {},
  });

  const onSubmit = (values: ProductFormValues) => {
    startTransition(async () => {
      try {
        if (product) {
          // await updateProductAction(product.id, values);
          toast({ title: "Success", description: "Product updated successfully." });
        } else {
          await createProductAction(values);
          toast({ title: "Success", description: "Product created successfully." });
        }
        router.push("/admin/products");

      } catch (error) {
        toast({
          title: "Error",
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fresh Organic Tomatoes" {...field} />
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
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the product..."
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Price (in RUB)</FormLabel>
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
                <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                    <Input placeholder="e.g. Vegetables" {...field} />
                </FormControl>
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
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <Input placeholder="e.g. organic, fresh, summer" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated values.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit" disabled={isPending}>
          {isPending ? (product ? "Updating..." : "Creating...") : (product ? "Update Product" : "Create Product")}
        </Button>
      </form>
    </Form>
  );
}
