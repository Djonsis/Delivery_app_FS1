import ProductForm from "../_components/product-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NewProductPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать новый товар</CardTitle>
        <CardDescription>
          Заполните форму ниже, чтобы добавить новый товар в ваш магазин.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProductForm />
      </CardContent>
    </Card>
  );
}
