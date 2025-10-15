
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { productsService } from "@/lib/products.service";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "./_components/products-table";

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const products = await productsService.getAll();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                <CardTitle>Товары</CardTitle>
                <CardDescription>
                    Управляйте вашими товарами и просматривайте их наличие.
                </CardDescription>
            </div>
            <Link href="/admin/products/new">
                <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Добавить товар
                </Button>
            </Link>
        </div>
      </CardHeader>
      <CardContent>
        <ProductsTable products={products} />
      </CardContent>
    </Card>
  );
}
