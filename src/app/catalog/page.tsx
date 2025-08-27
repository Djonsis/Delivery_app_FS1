
import ProductCatalog from "@/components/product-catalog";
import SiteHeader from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { getProducts, getCategories } from "@/lib/products.service";

interface CatalogPageProps {
    searchParams: { [key: string]: string | string[] | undefined }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  // Fetch data on the server
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories()
  ]);

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
             <Link href="/">
              <Button variant="ghost" className="text-sm text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Главная
              </Button>
            </Link>
        </div>
        <ProductCatalog 
          initialProducts={products}
          initialCategories={categories}
          searchParams={searchParams}
        />
      </main>
    </div>
  );
}
