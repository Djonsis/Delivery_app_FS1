
import TemplateForm from "../../_components/template-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { weightTemplatesService } from "@/lib/weight-templates.service";
import { notFound } from "next/navigation";

interface EditTemplatePageProps {
    params: {
        id: string;
    }
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const template = await weightTemplatesService.getById(params.id);

  if (!template) {
    notFound();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Редактировать шаблон</CardTitle>
        <CardDescription>
          Измените данные в форме ниже, чтобы обновить шаблон.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TemplateForm template={template} />
      </CardContent>
    </Card>
  );
}
