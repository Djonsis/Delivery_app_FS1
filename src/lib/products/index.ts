// src/lib/products/index.ts

export { productsService } from "./products.service";
export { mapDbRowToProduct } from "./helpers";

// ⚠️ Эти функции больше НЕ экспортируются, потому что:
/// - mapDbProductToProduct переименована -> mapDbRowToProduct
/// - toPostgresArray и generateSku… перенесены в products.service.ts
