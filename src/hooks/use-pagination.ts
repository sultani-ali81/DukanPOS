// src/hooks/usePagination.ts
import { useCallback, useState } from "react";

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount?: number;
}

export interface UsePaginationOptions {
  initialPage?: number;
  initialItemsPerPage?: number;
}

export function usePagination(options: UsePaginationOptions = {}) {
  const [page, setPage] = useState(options.initialPage ?? 1);
  const [itemsPerPage] = useState(options.initialItemsPerPage ?? 10);

  const goToPage = useCallback((pageNum: number) => {
    setPage(Math.max(1, pageNum));
  }, []);

  const nextPage = useCallback((totalPages: number) => {
    setPage((p) => Math.min(totalPages, p + 1));
  }, []);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const resetToPage1 = useCallback(() => {
    setPage(1);
  }, []);

  return {
    page,
    setPage,
    itemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    resetToPage1,
  };
}
