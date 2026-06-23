import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { getPurchases, purchasesKey } from "@/queries/purchase";
import type { PurchaseListItem } from "@/types/purchases";
import { useState } from "react";
import useSWR from "swr";

const PAGE_SIZE = 15;

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
  status: string;
  setStatus: (status: string) => void;
  mutate: () => void;
  isLoading: boolean;
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

  const [status, setStatusRaw] = useState<string>("ALL");

  const setStatus = (value: string) => {
    setStatusRaw(value);
    resetToPage1();
  };

  const swrKey = purchasesKey({
    search: debouncedSearch,
    page,
    itemsPerPage: PAGE_SIZE,
    status: status !== "ALL" ? status : undefined,
  });

  const { data, mutate, isLoading } = useSWR(swrKey, () =>
    getPurchases({
      search: debouncedSearch,
      page,
      itemsPerPage: PAGE_SIZE,
      status: status !== "ALL" ? status : undefined,
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
    status,
    setStatus,
    mutate,
    isLoading,
    PAGE_SIZE,
  };
}
