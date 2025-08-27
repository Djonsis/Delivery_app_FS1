
"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { ProductCard } from "@/components/product-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ArrowUpDown, SlidersHorizontal } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Product, SortOption } from "@/lib/types";
import { useRouter, useSearchParams, usePathname } from "next/navigation";


interface ProductCatalogProps {
  products: Product[];
  categories: string[];
}

export default function ProductCatalog({ products, categories }: ProductCatalogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isPending, startTransition] = useTransition();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('query') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'Все');
  const [sortOption, setSortOption] = useState<SortOption>((searchParams.get('sort') as SortOption) || "popularity");
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({
      min: searchParams.get('minPrice') ? Number(searchParams.get('minPrice')) : undefined,
      max: searchParams.get('maxPrice') ? Number(searchParams.get('maxPrice')) : undefined
  });
  
  const createQueryString = (params: Record<string, string | number | undefined>) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '' || (typeof value === 'number' && isNaN(value))) {
            newSearchParams.delete(key);
        } else {
            newSearchParams.set(key, String(value));
        }
    }
    return newSearchParams.toString();
  };

  const handleFilterChange = () => {
    startTransition(() => {
        router.push(`${pathname}?${createQueryString({
            query: searchTerm,
            category: selectedCategory === 'Все' ? undefined : selectedCategory,
            sort: sortOption,
            minPrice: priceRange.min,
            maxPrice: priceRange.max,
        })}`, { scroll: false });
    });
  }

  useEffect(() => {
    const handler = setTimeout(() => {
        handleFilterChange();
    }, 300); // Debounce input
    return () => clearTimeout(handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, selectedCategory, sortOption, priceRange]);
  
  const isPriceFilterActive = priceRange.min !== undefined || priceRange.max !== undefined;

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Все');
    setSortOption('popularity');
    setPriceRange({});
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Искать продукты..."
            className="w-full rounded-full pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 relative">
                <ArrowUpDown className="h-4 w-4" />
                {sortOption !== 'popularity' && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Сортировать по</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
                <DropdownMenuRadioItem value="popularity">Популярности</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="rating_desc">Рейтингу</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_desc">Сначала дороже</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="price_asc">Сначала дешевле</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="discount_desc" disabled>По размеру скидки</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0 relative">
                <SlidersHorizontal className="h-4 w-4" />
                {isPriceFilterActive && (
                    <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary border-2 border-background" />
                )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 p-4">
                <div className="flex justify-between items-center mb-4">
                    <DropdownMenuLabel className="p-0 font-bold">Цена</DropdownMenuLabel>
                    <Button variant="ghost" size="sm" onClick={handleResetFilters} className="h-auto p-1 text-xs">
                        Сброс
                    </Button>
                </div>
                <div className="flex items-center gap-2">
                    <Input 
                    type="number" 
                    placeholder="от" 
                    value={priceRange.min ?? ''} 
                    onChange={(e) => setPriceRange(prev => ({...prev, min: e.target.value ? Number(e.target.value) : undefined}))}
                    className="h-9"
                    />
                    <span className="text-muted-foreground">-</span>
                    <Input 
                    type="number" 
                    placeholder="до"
                    value={priceRange.max ?? ''} 
                    onChange={(e) => setPriceRange(prev => ({...prev, max: e.target.value ? Number(e.target.value) : undefined}))}
                    className="h-9"
                    />
                </div>
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>


      <div className="mt-8">
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
            {products.map((product) => (
            <ProductCard key={product.id} product={product} />
            ))}
        </div>
        {products.length === 0 && !isPending && (
            <div className="col-span-full mt-16 flex flex-col items-center justify-center">
                <p className="text-lg text-muted-foreground">Продукты не найдены.</p>
                <p className="text-sm text-muted-foreground">Попробуйте изменить поиск или фильтры.</p>
            </div>
        )}
    </div>
  );
}
