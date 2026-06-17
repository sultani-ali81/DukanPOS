import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { customersKey, getCustomers } from "@/queries/customer";
import useSWR from "swr";

const PAGE_SIZE = 10;

export function useCustomers() {
  const { page, setPage, resetToPage1 } = usePagination();
  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    onSearch: resetToPage1, // resets to page 1 on every new search
  });

  const swrKey = customersKey({
    search: debouncedSearch,
    page,
    itemsPerPage: PAGE_SIZE,
  });

  const { data, mutate, isLoading } = useSWR(swrKey, () =>
    getCustomers({ search: debouncedSearch, page, itemsPerPage: PAGE_SIZE }),
  );

  return {
    customers: data?.data ?? [],
    total: data?.meta?.totalCount ?? 0,
    totalPages: data?.meta?.totalPages ?? 1,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    mutate,
    isLoading,
    PAGE_SIZE,
  };
}
