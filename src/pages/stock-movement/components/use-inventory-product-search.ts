import { useMemo, useState } from "react";
import useSWR from "swr";

import { getInventory } from "@/queries/inventory";
import type { Suggestion } from "@/types/purchases";

interface InventoryProductMeta {
  productId: string;
  productName: string;
  availableQty: number;
}

export function useInventoryProductSearch(inventoryId: string) {
  const [displays, setDisplays] = useState<string[]>([""]);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { data, isLoading } = useSWR(
    inventoryId ? ["inventory-detail", inventoryId] : null,
    ([, id]) => getInventory(id),
  );

  const products = data?.products ?? [];

  const metaById = useMemo(() => {
    const map = new Map<string, InventoryProductMeta>();
    products.forEach((p) => {
      map.set(p.id, {
        productId: p.id,
        productName: p.name,
        availableQty: p.quantity,
      });
    });
    return map;
  }, [products]);

  const suggestionsFor = (query: string): Suggestion[] => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => p.quantity > 0)
      .filter((p) => !q || p.name.toLowerCase().includes(q))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        label: p.name,
        sub: `${p.quantity} available`,
      }));
  };

  const addRow = () => setDisplays((prev) => [...prev, ""]);

  const removeRow = (index: number) => {
    setDisplays((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex === index) setActiveIndex(null);
  };

  const updateDisplay = (index: number, value: string) => {
    setDisplays((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const resetDisplays = () => setDisplays([""]);

  return {
    displays,
    activeIndex,
    setActiveIndex,
    addRow,
    removeRow,
    updateDisplay,
    resetDisplays,
    suggestionsFor,
    metaById,
    isLoading,
  };
}
