import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { extractError } from "@/lib/error";
import { getProducts } from "@/queries/products";
import useSWR from "swr";

const PAGE_SIZE = 15;

function productsKey(params: {
  search: string;
  page: number;
  itemsPerPage: number;
}) {
  return `/products?search=${params.search}&page=${params.page}&itemsPerPage=${params.itemsPerPage}`;
}

export function useProducts() {
  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    onSearch: resetToPage1,
  });

  const swrKey = productsKey({
    search: debouncedSearch,
    page,
    itemsPerPage: PAGE_SIZE,
  });

  const { data, mutate, isLoading, error } = useSWR(swrKey, () =>
    getProducts({ search: debouncedSearch, page, itemsPerPage: PAGE_SIZE }),
  );

  return {
    products: data?.data ?? [],
    total: data?.meta?.totalItems ?? 0,
    totalPages: data?.meta?.totalPages ?? 1,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    mutate,
    isLoading,
    error: error ? extractError(error, "Failed to load products.") : null,
    PAGE_SIZE,
  };
}
