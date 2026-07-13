import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { customersKey, getCustomers } from "@/queries/customer";
import useSWR from "swr";

const PAGE_SIZE = 20;

export function useCustomers(options: { pageParam?: string } = {}) {
  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
    pageParam: options.pageParam ?? "page",
  });
  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    onSearch: resetToPage1,
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
