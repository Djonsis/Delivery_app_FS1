
import CategoryForm from "../../_components/category-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCategoryById } from "@/lib/categories.service";
import { notFound } from "next/navigation";

interface EditCategoryPageProps {
    params: {
        id: string;
    }
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const category = await getCategoryById(params.id);

  if (!category) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Редактировать категорию</CardTitle>
        <CardDescription>
          Измените данные в форме ниже, чтобы обновить категорию.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryForm category={category} />
      </CardContent>
    </Card>
  );
}
