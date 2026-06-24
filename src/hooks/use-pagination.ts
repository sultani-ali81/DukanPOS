import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

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
  pageParam?: string; // default: "page"
}

export function usePagination(options: UsePaginationOptions = {}) {
  const {
    initialPage = 1,
    initialItemsPerPage = 10,
    pageParam = "page",
  } = options;

  const [searchParams, setSearchParams] = useSearchParams();

  const rawParam = searchParams.get(pageParam);
  const page = rawParam
    ? Math.max(1, parseInt(rawParam, 10) || 1)
    : initialPage;

  const setPage = useCallback(
    (pageNum: number) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const clamped = Math.max(1, pageNum);
          if (clamped === initialPage) {
            next.delete(pageParam);
          } else {
            next.set(pageParam, String(clamped));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams, pageParam, initialPage],
  );

  const goToPage = useCallback(
    (pageNum: number) => setPage(Math.max(1, pageNum)),
    [setPage],
  );

  const nextPage = useCallback(
    (totalPages: number) => setPage(Math.min(totalPages, page + 1)),
    [setPage, page],
  );

  const prevPage = useCallback(
    () => setPage(Math.max(1, page - 1)),
    [setPage, page],
  );

  const resetToPage1 = useCallback(() => setPage(1), [setPage]);

  return {
    page,
    setPage,
    itemsPerPage: initialItemsPerPage,
    goToPage,
    nextPage,
    prevPage,
    resetToPage1,
  };
}
