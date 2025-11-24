import ProductForm from "../../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { productsService } from "@/lib/products/products.service";
import { notFound } from "next/navigation";
import { categoriesService } from "@/lib/categories.service";
import { weightTemplatesService } from "@/lib/weight-templates.service";

interface EditProductPageProps {
    // ✅ FIX 1: params теперь Promise
    params: Promise<{
        id: string;
    }>
}

export default async function EditProductPage(props: EditProductPageProps) {
  // ✅ FIX 2: Ожидаем params перед использованием
  const params = await props.params;
  const id = params.id;

  const [product, categories, weightTemplates] = await Promise.all([
    productsService.getById(id), // Используем уже извлеченный id
    categoriesService.getAll(),
    weightTemplatesService.getActive(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Редактировать товар</CardTitle>
        <CardDescription>
          Измените данные в форме ниже, чтобы обновить товар.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm 
          product={product}
          categories={categories}
          weightTemplates={weightTemplates}
        />
      </CardContent>
    </Card>
  );
}