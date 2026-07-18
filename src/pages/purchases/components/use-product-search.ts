import { useState } from "react";
import { useDebounce } from "use-debounce";
import useSWR from "swr";

import { getProducts } from "@/queries/products";
import type { Suggestion } from "@/types/purchases";

export function useProductSearch(initialDisplays: string[] = [""]) {
  const [displays, setDisplays] = useState<string[]>(() =>
    initialDisplays.length ? initialDisplays : [""],
  );
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeSearch =
    activeIndex !== null ? (displays[activeIndex] ?? "") : "";
  const [debounced] = useDebounce(activeSearch, 300);
  const normalizedSearch = activeSearch.trim();
  const searchReady =
    activeIndex !== null &&
    normalizedSearch.length > 0 &&
    debounced.trim() === normalizedSearch;
  const { data, isLoading } = useSWR(
    searchReady
      ? ([
          "products",
          { search: debounced, page: 1, itemsPerPage: 100 },
        ] as const)
      : null,
    ([, params]) => getProducts(params),
  );
  const activeSuggestions: Suggestion[] = (data?.data ?? []).map((product) => ({
    id: product.id,
    label: product.name,
    sub: product.price
      ? `AFN ${Number(product.price).toLocaleString()}`
      : undefined,
    price: Number(product.price),
  }));
  const suggestions: Record<number, Suggestion[]> =
    activeIndex === null ? {} : { [activeIndex]: activeSuggestions };
  const loadingMap: Record<number, boolean> =
    activeIndex === null ? {} : { [activeIndex]: isLoading };

  const addRow = () => setDisplays((p) => [...p, ""]);

  const removeRow = (index: number) => {
    setDisplays((p) => p.filter((_, i) => i !== index));
    setActiveIndex((current) => {
      if (current === null || current < index) return current;
      if (current === index) return null;
      return current - 1;
    });
  };

  const updateDisplay = (index: number, value: string) => {
    setDisplays((p) => {
      const next = [...p];
      next[index] = value;
      return next;
    });
    if (value.trim()) {
      setActiveIndex(index);
    }
  };

  const activateRow = (index: number) => {
    setActiveIndex(index);
  };

  return {
    displays,
    setDisplays,
    suggestions,
    loadingMap,
    activeIndex,
    setActiveIndex,
    addRow,
    removeRow,
    updateDisplay,
    activateRow,
  };
}
