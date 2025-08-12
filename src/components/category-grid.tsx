"use client"

import Image from "next/image"
import Link from "next/link"

const categories = [
    { name: "Овощи, фрукты", href: "/catalog?category=Фрукты", imageUrl: "https://placehold.co/300x200.png", hint: "vegetables fruits" },
    { name: "Молоко, сыр, яйца", href: "/catalog", imageUrl: "https://placehold.co/300x200.png", hint: "milk cheese" },
    { name: "Хлеб и выпечка", href: "/catalog?category=Выпечка", imageUrl: "https://placehold.co/300x200.png", hint: "bread pastry" },
    { name: "Соленья", href: "/catalog", imageUrl: "https://placehold.co/300x200.png", hint: "pickles" },
    { name: "Импорт", href: "/catalog", imageUrl: "https://placehold.co/300x200.png", hint: "import goods" },
    { name: "Все товары", href: "/catalog", imageUrl: "https://placehold.co/300x200.png", hint: "all products" },
]

export default function CategoryGrid() {
    return (
        <div className="mt-12">
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-3 md:gap-6 lg:grid-cols-6">
                {categories.map((category) => (
                    <Link key={category.name} href={category.href} className="group relative flex flex-col items-center justify-center text-center">
                        <div className="relative aspect-square w-full overflow-hidden rounded-lg sm:aspect-[4/3]">
                             <Image
                                src={category.imageUrl}
                                alt={category.name}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                data-ai-hint={category.hint}
                            />
                        </div>
                        <span className="mt-2 text-sm font-medium text-foreground group-hover:text-primary">{category.name}</span>
                    </Link>
                ))}
            </div>
        </div>
    )
}
