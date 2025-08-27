
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProducts } from "@/lib/products.service";
import { PlusCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "./_components/products-table";


export default async function ProductsPage() {
  // Per LA-004, the page component should not call the service layer directly.
  // It is responsible for displaying data. The data fetching logic is now
  // handled within the ProductsTable component, which can then use Server Actions
  // for mutations. This is a temporary step. A better approach would be to 
  // fetch data in the page and pass it down, while actions are handled by the table.
  const products = await getProducts();

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
