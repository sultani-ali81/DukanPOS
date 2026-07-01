import { useEffect, useState } from "react";
import { useDebounce } from "use-debounce";

import { getProducts } from "@/queries/products";
import type { Suggestion } from "@/types/purchases";

export function useProductSearch() {
  const [displays, setDisplays] = useState<string[]>([""]);
  const [suggestions, setSuggestions] = useState<Record<number, Suggestion[]>>(
    {},
  );
  const [loadingMap, setLoadingMap] = useState<Record<number, boolean>>({});
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const activeSearch =
    activeIndex !== null ? (displays[activeIndex] ?? "") : "";
  const [debounced] = useDebounce(activeSearch, 300);

  useEffect(() => {
    if (activeIndex === null || !debounced.trim()) return;

    const index = activeIndex;
    let cancelled = false;
    getProducts({ search: debounced, page: 1, itemsPerPage: 8 })
      .then(({ data }) => {
        if (cancelled) return;
        setSuggestions((p) => ({
          ...p,
          [index]: data.map((pr) => ({
            id: pr.id,
            label: pr.name,
            sub: pr.price
              ? `AFN ${Number(pr.price).toLocaleString()}`
              : undefined,
          })),
        }));
      })
      .catch(() => {
        if (!cancelled) setSuggestions((p) => ({ ...p, [index]: [] }));
      })
      .finally(() => {
        if (!cancelled) setLoadingMap((p) => ({ ...p, [index]: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, activeIndex]);

  const addRow = () => setDisplays((p) => [...p, ""]);

  const removeRow = (index: number) => {
    setDisplays((p) => p.filter((_, i) => i !== index));
    setSuggestions((p) => {
      const n = { ...p };
      delete n[index];
      return n;
    });
    setLoadingMap((p) => {
      const n = { ...p };
      delete n[index];
      return n;
    });
    if (activeIndex === index) setActiveIndex(null);
  };

  const updateDisplay = (index: number, value: string) => {
    setDisplays((p) => {
      const next = [...p];
      next[index] = value;
      return next;
    });
    if (value.trim()) {
      setLoadingMap((p) => ({ ...p, [index]: true }));
    } else {
      setSuggestions((p) => ({ ...p, [index]: [] }));
      setLoadingMap((p) => ({ ...p, [index]: false }));
    }
  };

  const activateRow = (index: number) => {
    setActiveIndex(index);
    if ((displays[index] ?? "").trim()) {
      setLoadingMap((p) => ({ ...p, [index]: true }));
    }
  };

  return {
    displays,
    setDisplays,
    suggestions,
    setSuggestions,
    loadingMap,
    activeIndex,
    setActiveIndex,
    addRow,
    removeRow,
    updateDisplay,
    activateRow,
  };
}
