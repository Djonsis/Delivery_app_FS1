
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import TemplateForm from "../_components/template-form";

export default function NewTemplatePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Создать новый шаблон</CardTitle>
        <CardDescription>
          Заполните форму ниже, чтобы добавить новый шаблон весовых товаров.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplateForm />
      </CardContent>
    </Card>
  );
}
