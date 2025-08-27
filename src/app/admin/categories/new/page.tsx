
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import CategoryForm from "../_components/category-form";

export default function NewCategoryPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать новую категорию</CardTitle>
        <CardDescription>
          Заполните форму ниже, чтобы добавить новую категорию в ваш магазин.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryForm />
      </CardContent>
    </Card>
  );
}
