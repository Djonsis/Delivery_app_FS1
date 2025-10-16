// src/lib/products/index.ts

// Основной сервис
export { productsService } from "./products.service";
export type { ProductsService } from "./products.service";

// Вспомогательные функции (при необходимости их тоже можно использовать извне)
export { 
    mapDbProductToProduct, 
    toPostgresArray, 
    generateSkuForCategory 
} from "./helpers";
