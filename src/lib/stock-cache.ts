export interface StockCacheScope {
  inventoryIds: Set<string>;
  productIds: Set<string>;
  purchaseId?: string;
  saleId?: string;
}

export function createStockMutationMatcher(scope: StockCacheScope) {
  return (key: unknown): boolean => {
    if (typeof key === "string") {
      if (key.startsWith("/products?")) return true;
      if (scope.purchaseId && key.startsWith("/purchase?")) return true;
      if (scope.saleId) {
        return key.startsWith("/sales?") || key === `/sales/${scope.saleId}`;
      }
      return false;
    }

    if (!Array.isArray(key)) return false;

    const [family, resourceId] = key;
    if (
      family === "inventories" ||
      family === "products" ||
      family === "dashboard" ||
      family === "reports"
    ) {
      return true;
    }
    if (family === "inventory-detail") {
      return typeof resourceId === "string" && scope.inventoryIds.has(resourceId);
    }
    if (family === "pos-inventory") {
      return typeof resourceId === "string" && scope.inventoryIds.has(resourceId);
    }
    if (family === "product-detail") {
      return typeof resourceId === "string" && scope.productIds.has(resourceId);
    }
    if (family === "purchase-detail") {
      return resourceId === scope.purchaseId;
    }

    return false;
  };
}
