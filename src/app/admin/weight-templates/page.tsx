
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllWeightTemplates } from "@/lib/weight-templates.service";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import TemplatesTable from "./_components/templates-table";

export default async function WeightTemplatesPage() {
    const templates = await getAllWeightTemplates();

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Шаблоны весовых товаров</CardTitle>
                        <CardDescription>
                            Управляйте пресетами для быстрой настройки весовых товаров.
                        </CardDescription>
                    </div>
                    <Link href="/admin/weight-templates/new">
                        <Button>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Добавить шаблон
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <TemplatesTable templates={templates} />
            </CardContent>
        </Card>
    );
}
