import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { CartProvider } from '@/contexts/cart-context';

// Настраиваем шрифт Inter с помощью next/font
const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-inter', // Создаем CSS-переменную
});

export const metadata: Metadata = {
  title: 'БыстраяКорзина',
  description: 'Свежий взгляд на покупку продуктов онлайн.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      {/* Теги <link> для шрифтов удалены, так как next/font управляет этим */}
      <body className={`${inter.variable} font-sans antialiased`}>
        <CartProvider>
          {children}
          <Toaster />
        </CartProvider>
      </body>
    </html>
  );
}
