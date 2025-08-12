import ProductCatalog from "@/components/product-catalog";
import SiteHeader from "@/components/site-header";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <ProductCatalog />
      </main>
    </div>
  );
}
