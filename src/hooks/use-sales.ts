import { extractError } from "@/lib/error";
import { getSale, getSales, salesKey } from "@/queries/sale";
import type {
  PaginatedSales,
  SaleDetail,
  SaleListItem,
} from "@/types/sale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import useSWR from "swr";
import { useDebounce } from "use-debounce";

export const SALES_PAGE_SIZES = [10, 20, 50, 100] as const;
export const DEFAULT_SALES_PAGE_SIZE = 20;

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function supportedPageSize(value: string | null): number {
  const parsed = positiveInteger(value, DEFAULT_SALES_PAGE_SIZE);
  return SALES_PAGE_SIZES.includes(
    parsed as (typeof SALES_PAGE_SIZES)[number],
  )
    ? parsed
    : DEFAULT_SALES_PAGE_SIZE;
}

export interface UseSalesReturn {
  sales: SaleListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalCount: number;
  totalPages: number;
  search: string;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  clearSearch: () => void;
  refresh: () => Promise<PaginatedSales | undefined>;
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
}

export function useSales(): UseSalesReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedPage = positiveInteger(searchParams.get("page"), 1);
  const requestedPageSize = supportedPageSize(
    searchParams.get("itemsPerPage"),
  );
  const [search, setSearchState] = useState(
    () => searchParams.get("search") ?? "",
  );
  const [debouncedSearch] = useDebounce(search.trim(), 400);

  const setPage = useCallback(
    (nextPage: number) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          const safePage = Math.max(1, Math.floor(nextPage));
          if (safePage === 1) next.delete("page");
          else next.set("page", String(safePage));
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      const safePageSize = SALES_PAGE_SIZES.includes(
        nextPageSize as (typeof SALES_PAGE_SIZES)[number],
      )
        ? nextPageSize
        : DEFAULT_SALES_PAGE_SIZE;

      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete("page");
          if (safePageSize === DEFAULT_SALES_PAGE_SIZE) {
            next.delete("itemsPerPage");
          } else {
            next.set("itemsPerPage", String(safePageSize));
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const setSearch = useCallback(
    (value: string) => {
      setSearchState(value);
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          next.delete("page");
          if (value) next.set("search", value);
          else next.delete("search");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  const query = useMemo(
    () => ({
      page: requestedPage,
      itemsPerPage: requestedPageSize,
      search: debouncedSearch || undefined,
    }),
    [debouncedSearch, requestedPage, requestedPageSize],
  );

  const { data, error: swrError, isLoading, isValidating, mutate } = useSWR(
    salesKey(query),
    () => getSales(query),
    { keepPreviousData: true },
  );

  const totalPages = Math.max(0, data?.meta.totalPages ?? 0);
  const serverPage = isValidating
    ? requestedPage
    : (data?.meta.currentPage ?? requestedPage);
  const page =
    totalPages === 0
      ? 1
      : Math.min(totalPages, Math.max(1, serverPage || requestedPage));

  useEffect(() => {
    if (!data || isValidating) return;
    if (requestedPage !== page) setPage(page);
  }, [data, isValidating, page, requestedPage, setPage]);

  return {
    sales: data?.data ?? [],
    page,
    pageSize: isValidating
      ? requestedPageSize
      : (data?.meta.itemsPerPage ?? requestedPageSize),
    totalItems: data?.meta.totalItems ?? 0,
    totalCount: data?.meta.totalCount ?? 0,
    totalPages,
    search,
    setPage,
    setPageSize,
    setSearch,
    clearSearch: () => setSearch(""),
    refresh: () => mutate(),
    isLoading,
    isValidating,
    error: swrError
      ? extractError(swrError, "Could not load sales. Please try again.")
      : null,
  };
}

export interface UseSaleReturn {
  sale: SaleDetail | undefined;
  refresh: () => Promise<SaleDetail | undefined>;
  isLoading: boolean;
  isValidating: boolean;
  error: unknown;
  errorMessage: string | null;
}

export function useSale(id: string | undefined): UseSaleReturn {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    id ? `/sales/${id}` : null,
    () => getSale(id as string),
  );

  return {
    sale: data,
    refresh: () => mutate(),
    isLoading,
    isValidating,
    error,
    errorMessage: error
      ? extractError(error, "Could not load this sale. Please try again.")
      : null,
  };
}
