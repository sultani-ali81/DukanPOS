import type { StockStatus } from "@/types/inventory";

export const LOW_STOCK_THRESHOLD = 10;

export type StockFilter =
  | "all"
  | "in_stock"
  | "low_stock"
  | "out_of_stock";

export function getStockStatus(quantity: number): StockStatus {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
}

export function matchesStockFilter(
  quantity: number,
  filter: StockFilter,
): boolean {
  if (filter === "all") return true;

  const status = getStockStatus(quantity);
  if (filter === "in_stock") return status === "In Stock";
  if (filter === "low_stock") return status === "Low Stock";
  return status === "Out of Stock";
}
