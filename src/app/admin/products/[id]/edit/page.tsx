
import ProductForm from "../../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { productsService } from "@/lib/products.service";
import { notFound } from "next/navigation";
import { categoriesService } from "@/lib/categories.service";
import { weightTemplatesService } from "@/lib/weight-templates.service";

interface EditProductPageProps {
    params: {
        id: string;
    }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const [product, categories, weightTemplates] = await Promise.all([
    productsService.getById(params.id),
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
