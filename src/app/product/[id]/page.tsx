"use client";

import Image from 'next/image';
import { notFound, useParams } from 'next/navigation';
import { products } from '@/lib/products';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Star, MessageCircle, Plus, Minus } from 'lucide-react';
import SiteHeader from '@/components/site-header';
import ProductCarousel from './_components/product-carousel';
import { useCart } from '@/hooks/use-cart';

export default function ProductPage() {
  const params = useParams() as { id: string };
  const product = products.find((p) => p.id === params.id);
  const { addToCart, updateQuantity, getCartItem } = useCart();

  if (!product) {
    notFound();
  }
  
  const cartItem = getCartItem(product.id);

  const relatedProducts = products.filter(p => p.category === product.category && p.id !== product.id).slice(0, 5);
  
  const getPrecision = (step: number) => {
    const stepStr = step.toString();
    if (stepStr.includes('.')) {
      return stepStr.split('.')[1].length;
    }
    return 0;
  };
  const precision = getPrecision(product.step_quantity);

  const incrementQuantity = () => {
    const currentQuantity = cartItem ? cartItem.quantity : 0;
    const newQuantity = parseFloat((currentQuantity + product.step_quantity).toFixed(precision));
    if (currentQuantity === 0) {
      updateQuantity(product.id, product.min_order_quantity);
    } else {
      updateQuantity(product.id, newQuantity);
    }
  };
  
  const decrementQuantity = () => {
    if (cartItem) {
      const newQuantity = parseFloat((cartItem.quantity - product.step_quantity).toFixed(precision));
      if (newQuantity >= product.min_order_quantity) {
        updateQuantity(product.id, newQuantity);
      } else {
        updateQuantity(product.id, 0);
      }
    }
  };

  const displayedQuantity = cartItem?.quantity ? (cartItem.quantity.toFixed(precision)) : '0';


  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <SiteHeader />
      <main className="flex-1 py-8">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-12">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl">
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-cover"
                data-ai-hint={product.category}
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-primary fill-primary" />
                  <span className="text-lg font-semibold">{product.rating.toFixed(1)}</span>
                </div>
                <a href="#reviews" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:underline">
                    <MessageCircle className="h-4 w-4" />
                    <span>{product.reviews} отзывов</span>
                </a>
              </div>
              <p className="mt-4 text-muted-foreground">{product.description}</p>
              
              <div className="mt-6">
                <p className="text-4xl font-bold text-primary">{Math.round(product.price)} ₽ {product.weight && <span className="text-lg font-normal text-muted-foreground">/ {product.weight}</span>}</p>
              </div>

              <div className="mt-6">
                 {cartItem && cartItem.quantity > 0 ? (
                  <div className="flex w-full items-center justify-between gap-2">
                    <Button variant="outline" size="lg" className="flex-1" onClick={decrementQuantity}>
                      <Minus className="h-5 w-5" />
                    </Button>
                     <div className="flex h-11 min-w-24 items-center justify-center rounded-md border border-input bg-background text-center text-xl font-bold">
                      {displayedQuantity}
                    </div>
                    <Button variant="outline" size="lg" className="flex-1" onClick={incrementQuantity}>
                      <Plus className="h-5 w-5" />
                    </Button>
                  </div>
                ) : (
                   <Button size="lg" className="w-full" onClick={() => addToCart(product)}>
                    Добавить в корзину
                  </Button>
                )}
              </div>

              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Пищевая ценность</CardTitle>
                    <CardDescription>на 100 г продукта</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {product.nutrition ? (
                      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <div className="text-center">
                          <p className="font-bold">{product.nutrition.calories}</p>
                          <p className="text-sm text-muted-foreground">ккал</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{product.nutrition.protein} г</p>
                          <p className="text-sm text-muted-foreground">белки</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{product.nutrition.fat} г</p>
                          <p className="text-sm text-muted-foreground">жиры</p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold">{product.nutrition.carbs} г</p>
                          <p className="text-sm text-muted-foreground">углеводы</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Информация о пищевой ценности отсутствует.</p>
                    )}
                  </CardContent>
                </Card>
              </div>

               <div className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Характеристики</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Бренд:</span>
                        <span>{product.brand || 'Не указан'}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-muted-foreground">Производитель:</span>
                        <span>{product.manufacturer || 'Не указан'}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <Separator className="my-12" />

          <div id="reviews">
             <h2 className="text-2xl font-bold tracking-tight">Отзывы</h2>
             {/* Reviews section will be implemented here */}
             <div className="mt-6 flex h-48 items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-muted-foreground">Раздел отзывов в разработке</p>
             </div>
          </div>

          <Separator className="my-12" />
          
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Похожие товары</h2>
            <ProductCarousel products={relatedProducts} />
          </div>

        </div>
      </main>
    </div>
  );
}
