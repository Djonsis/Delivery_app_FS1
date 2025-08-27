
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getAllCategories } from "@/lib/categories.service";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import CategoriesTable from "./_components/categories-table";

export default async function CategoriesPage() {
    const categories = await getAllCategories();

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Категории</CardTitle>
                        <CardDescription>
                            Управляйте категориями товаров для вашего магазина.
                        </CardDescription>
                    </div>
                    <Link href="/admin/categories/new">
                        <Button>
                            <PlusCircle className="h-4 w-4 mr-2" />
                            Добавить категорию
                        </Button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent>
                <CategoriesTable categories={categories} />
            </CardContent>
        </Card>
    );
}
