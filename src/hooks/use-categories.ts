import { getCategories } from "@/queries/category";
import type { Category } from "@/types";
import { useEffect, useRef, useState } from "react";
import { usePagination } from "./use-pagination";
import { useSearch } from "./use-search";

const ITEMS_PER_PAGE = 10;

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [meta, setMeta] = useState({
    currentPage: 1,
    itemsPerPage: ITEMS_PER_PAGE,
    totalItems: 0,
    totalPages: 1,
    totalCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page, goToPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    debounceMs: 400,
    onSearch: resetToPage1,
  });

  const debouncedSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    debouncedSearchRef.current = debouncedSearch;
  }, [debouncedSearch]);

  const fetchCategories = () => {
    setLoading(true);
    setError(null);
    getCategories({
      page,
      itemsPerPage: ITEMS_PER_PAGE,
      search: debouncedSearchRef.current || undefined,
    })
      .then(({ data, meta }) => {
        setCategories(data);
        setMeta(meta);
      })
      .catch((err) => {
        setError(
          err?.response?.data?.message ?? (err as string) ?? "Failed to load",
        );
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch]);

  return {
    categories,
    meta,
    loading,
    error,
    page,
    goToPage,
    totalPages: meta.totalPages,
    totalItems: meta.totalItems,
    search,
    handleSearch,
    clearSearch,
    mutate: fetchCategories,
  };
}
