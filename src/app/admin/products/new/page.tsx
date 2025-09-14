import ProductForm from "../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { categoriesService } from "@/lib/categories.service";
import { weightTemplatesService } from "@/lib/weight-templates.service";

export default async function NewProductPage() {
  const [categories, weightTemplates] = await Promise.all([
    categoriesService.getAll(),
    weightTemplatesService.getActive(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать новый товар</CardTitle>
        <CardDescription>
          Заполните форму ниже, чтобы добавить новый товар в ваш магазин.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm 
          categories={categories}
          weightTemplates={weightTemplates}
        />
      </CardContent>
    </Card>
  );
}
