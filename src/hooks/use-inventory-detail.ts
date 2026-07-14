import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { extractError } from "@/lib/error";
import {
  getStockStatus,
  matchesStockFilter,
  type StockFilter,
} from "@/lib/stock-status";
import { getInventory } from "@/queries/inventory";
import type { InventoryProduct } from "@/types/inventory";
import { useMemo, useState } from "react";
import useSWR from "swr";

export function useInventoryDetail(id: string) {
  const [status, setStatus] = useState<StockFilter>("all");

  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: 20,
    pageParam: "productPage",
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    debounceMs: 300,
    onSearch: resetToPage1,
  });

  const { data, isLoading, error, mutate } = useSWR(
    id ? ["inventory-detail", id] : null,
    ([, inventoryId]) => getInventory(inventoryId),
  );

  const filtered = useMemo((): InventoryProduct[] => {
    const products = data?.products ?? [];
    return products.filter((p) => {
      const matchesStatus = matchesStockFilter(p.quantity, status);

      const matchesSearch =
        !debouncedSearch ||
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [data, status, debouncedSearch]);

  const ITEMS_PER_PAGE = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paged = filtered.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const stats = useMemo(() => {
    const products = data?.products ?? [];
    return {
      total: products.length,
      inStock: products.filter(
        (p) => getStockStatus(p.quantity) === "In Stock",
      ).length,
      lowStock: products.filter(
        (p) => getStockStatus(p.quantity) === "Low Stock",
      ).length,
      outOfStock: products.filter(
        (p) => getStockStatus(p.quantity) === "Out of Stock",
      ).length,
      totalUnits: products.reduce((s, p) => s + p.quantity, 0),
      stockValue: products.reduce((s, p) => s + p.quantity * p.price, 0),
    };
  }, [data]);

  return {
    inventory: data ?? null,
    loading: isLoading,
    error: error ? extractError(error, "Failed to load inventory") : null,
    mutate,
    // products
    filtered: paged,
    totalFiltered: filtered.length,
    // pagination
    page,
    setPage,
    totalPages,
    // search
    search,
    handleSearch,
    clearSearch,
    // status filter
    status,
    setStatus,
    stats,
  };
}
