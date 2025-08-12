import CategoryGrid from "@/components/category-grid";
import SiteHeader from "@/components/site-header";

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <SiteHeader />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex-1">
                <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    🥦😋 Вкусная грядка
                </h1>
                <p className="mt-2 text-lg text-muted-foreground">
                    Доставка свежих фруктов и овощей в Сочи 🍎
                </p>
                </div>
            </div>
            <CategoryGrid />
        </div>
      </main>
    </div>
  );
}
