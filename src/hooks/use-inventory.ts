import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { extractError } from "@/lib/error";
import { getInventories } from "@/queries/inventory";
import type { Inventory, PaginationMeta } from "@/types/inventory";
import useSWR, { useSWRConfig } from "swr";

const ITEMS_PER_PAGE = 10;

export interface UseInventoryReturn {
  inventories: Inventory[];
  paginationMeta: PaginationMeta;
  loading: boolean;
  error: string | null;
  page: number;
  goToPage: (page: number) => void;
  listSearch: string;
  setListSearch: (value: string) => void;
  clearListSearch: () => void;
  handleInventoryAdded: () => Promise<void>;
  handleInventoryUpdated: (id: string) => Promise<void>;
  handleInventoryDeleted: (id: string) => Promise<void>;
}

export function useInventory(): UseInventoryReturn {
  const { mutate: mutateCache } = useSWRConfig();
  const { page, setPage, goToPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const {
    search: listSearch,
    debouncedSearch: listSearchDebounced,
    handleSearch: setListSearch,
    clearSearch: clearListSearch,
  } = useSearch({ debounceMs: 400, onSearch: resetToPage1 });

  const listKey = [
    "inventories",
    { page, itemsPerPage: ITEMS_PER_PAGE, search: listSearchDebounced },
  ] as const;

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
  } = useSWR(listKey, ([, params]) => getInventories(params));

  const inventories = listData?.data ?? [];

  const paginationMeta: PaginationMeta = listData?.meta ?? {
    currentPage: 1,
    itemsPerPage: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
    totalCount: 0,
  };

  const loading = listLoading && !listData;

  const error = listError
    ? extractError(listError, "Failed to load inventories")
    : null;

  const handleInventoryAdded = async () => {
    await mutateCache(createCrudFamilyMatcher("inventories"));
  };

  const handleInventoryUpdated = async (id: string) => {
    await mutateCache(createCrudFamilyMatcher("inventories", id));
  };

  const handleInventoryDeleted = async (id: string) => {
    setPage(1);
    await mutateCache(createCrudFamilyMatcher("inventories", id));
  };

  return {
    inventories,
    paginationMeta,
    loading,
    error,
    page,
    goToPage,
    listSearch,
    setListSearch,
    clearListSearch,
    handleInventoryAdded,
    handleInventoryUpdated,
    handleInventoryDeleted,
  };
}
