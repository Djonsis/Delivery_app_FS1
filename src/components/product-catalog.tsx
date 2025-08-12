"use client";

import { useState, useMemo } from "react";
import { products, categories } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export default function ProductCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) =>
        selectedCategory === "Все" ? true : product.category === selectedCategory
      )
      .filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [searchTerm, selectedCategory]);

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Вкусная грядка
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Доставка свежих фруктов и овощей в Сочи
          </p>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Искать продукты..."
            className="w-full rounded-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2">
        <Button variant="outline" size="icon" className="shrink-0">
          <ArrowUpDown className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="shrink-0">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex w-max space-x-2">
            <Button
              variant={selectedCategory === 'Все' ? 'default' : 'outline'}
              className={cn("rounded-full", selectedCategory === 'Все' && "bg-primary text-primary-foreground")}
              onClick={() => setSelectedCategory('Все')}
            >
              Все
            </Button>
            {categories.map((category) => (
               <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                className={cn("rounded-full", selectedCategory === category && "bg-primary text-primary-foreground")}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" className="h-2" />
        </ScrollArea>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-4">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {filteredProducts.length === 0 && (
        <div className="col-span-full mt-16 flex flex-col items-center justify-center">
            <p className="text-lg text-muted-foreground">Продукты не найдены.</p>
            <p className="text-sm text-muted-foreground">Попробуйте изменить поиск или фильтры.</p>
        </div>
      )}
    </div>
  );
}
