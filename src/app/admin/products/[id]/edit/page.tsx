
import ProductForm from "../../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProductById } from "@/lib/products.service";
import { notFound } from "next/navigation";

interface EditProductPageProps {
    params: {
        id: string;
    }
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const product = await getProductById(params.id);

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
        <ProductForm product={product} />
      </CardContent>
    </Card>
  );
}
