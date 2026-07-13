import { getCategories } from "@/queries/category";
import type { Category } from "@/types";
import useSWR from "swr";
import { usePagination } from "./use-pagination";
import { useSearch } from "./use-search";
const ITEMS_PER_PAGE = 15;
export interface UseCategoriesReturn {
  categories: Category[];
  meta: {
    currentPage: number;
    itemsPerPage: number;
    totalItems: number;
    totalPages: number;
    totalCount: number;
  };
  loading: boolean;
  error: string | null;
  page: number;
  goToPage: (page: number) => void;
  totalPages: number;
  totalItems: number;
  search: string;
  handleSearch: (value: string) => void;
  clearSearch: () => void;
  mutate: () => Promise<void>;
}

export function useCategories(): UseCategoriesReturn {
  const { page, goToPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    debounceMs: 400,
    onSearch: resetToPage1,
  });

  const swrKey = [
    "categories",

    { page, itemsPerPage: ITEMS_PER_PAGE, search: debouncedSearch },
  ] as const;

  const { data, error, isLoading, mutate } = useSWR(swrKey, ([, params]) =>
    getCategories(params),
  );

  const categories = data?.data ?? [];
  const meta = data?.meta ?? {
    currentPage: 1,
    itemsPerPage: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
    totalCount: 0,
  };

  const loading = isLoading && !data;

  const errorMessage: string | null = error
    ? (error?.response?.data?.message ??
      error?.message ??
      "Failed to load categories")
    : null;
  return {
    categories,
    meta,
    loading,
    error: errorMessage,
    page,
    goToPage,
    totalPages: meta.totalPages,
    totalItems: meta.totalItems,
    search,
    handleSearch,
    clearSearch,
    mutate: async () => {
      await mutate();
    },
  };
}
