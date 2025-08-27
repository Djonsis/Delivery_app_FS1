
"use client"

import Image from "next/image"
import Link from "next/link"
import { Category } from "@/lib/types"

interface CategoryGridProps {
    categories: Category[];
}

export default function CategoryGrid({ categories }: CategoryGridProps) {
    return (
        <div className="mt-12">
            <div className="grid grid-cols-3 gap-6 sm:grid-cols-3 md:gap-8 lg:grid-cols-6">
                {categories.map((category) => (
                    <Link key={category.id} href={`/catalog?category=${encodeURIComponent(category.name)}`} className="group relative flex flex-col items-center text-center">
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:aspect-[4/3]">
                             <Image
                                src={`https://placehold.co/300x200.png?text=${encodeURIComponent(category.name)}`}
                                alt={category.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint={category.slug}
                            />
                        </div>
                        <span className="mt-2 flex h-10 items-center justify-center text-sm font-medium text-foreground group-hover:text-primary">{category.name}</span>
                    </Link>
                ))}
                 <Link href="/catalog" className="group relative flex flex-col items-center text-center">
                    <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:aspect-[4/3]">
                        <Image
                            src="https://placehold.co/300x200.png?text=Все"
                            alt="Все товары"
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            data-ai-hint="all products"
                        />
                    </div>
                    <span className="mt-2 flex h-10 items-center justify-center text-sm font-medium text-foreground group-hover:text-primary">Все товары</span>
                </Link>
            </div>
        </div>
    )
}
