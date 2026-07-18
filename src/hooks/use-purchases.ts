import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { extractError } from "@/lib/error";
import { getPurchases, purchasesKey } from "@/queries/purchase";
import type { PurchaseListItem } from "@/types/purchases";
import useSWR from "swr";

const PAGE_SIZE = 20;

export interface UsePurchasesReturn {
  purchases: PurchaseListItem[];
  total: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  page: number;
  setPage: (page: number) => void;
  search: string;
  handleSearch: (value: string) => void;
  clearSearch: () => void;
  mutate: () => void;
  isLoading: boolean;
  error: string | null;
  PAGE_SIZE: number;
}

export function usePurchases(): UsePurchasesReturn {
  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    onSearch: resetToPage1,
  });

  const swrKey = purchasesKey({
    search: debouncedSearch,
    page,
    itemsPerPage: PAGE_SIZE,
  });

  const { data, mutate, isLoading, error } = useSWR(swrKey, () =>
    getPurchases({
      search: debouncedSearch,
      page,
      itemsPerPage: PAGE_SIZE,
    }),
  );

  const totalItems = data?.meta?.totalItems ?? 0;
  const itemsPerPage = data?.meta?.itemsPerPage ?? PAGE_SIZE;

  return {
    purchases: data?.data ?? [],
    total: totalItems,
    totalItems,
    totalPages: data?.meta?.totalPages ?? 1,
    itemsPerPage,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    mutate,
    isLoading,
    error: error ? extractError(error, "Failed to load purchases.") : null,
    PAGE_SIZE,
  };
}
