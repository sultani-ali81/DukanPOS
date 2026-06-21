import { useEffect, useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import type { Inventory } from "@/queries/inventory";
import { getInventories } from "@/queries/inventory";
import { useDebounce } from "use-debounce";

interface InventoryComboboxProps {
  value: string;
  onChange: (id: string) => void;
}

export default function InventoryCombobox({
  value,
  onChange,
}: InventoryComboboxProps) {
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const [debouncedSearch] = useDebounce(search, 400);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    getInventories({
      page: 1,
      itemsPerPage: 8,
      search: debouncedSearch.trim() || undefined,
    })
      .then(({ data }) => {
        if (!cancelled) setInventories(data);
      })
      .catch(() => {
        if (!cancelled) setInventories([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, debouncedSearch]);

  const selectedName = inventories.find((inv) => inv.id === value)?.name ?? "";

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      value={selectedName}
      filter={() => true}
      onValueChange={(name: string | null) => {
        const inv = inventories.find((i) => i.name === (name ?? ""));
        onChange(inv?.id ?? "");
        setSearch("");
      }}
    >
      <ComboboxInput
        placeholder={selectedName || "Assign to inventory..."}
        onChange={(e) => setSearch(e.target.value)}
        showClear={!!value}
        className="h-10 rounded-xl border border-gray-200 bg-transparent px-3 text-sm shadow-none focus:border-gray-300 focus:ring-3 focus:ring-gray-100"
      />

      <ComboboxContent className="w-[var(--anchor-width)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <ComboboxList className="max-h-80 overflow-y-auto p-1">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          {!loading && inventories.length === 0 && (
            <ComboboxEmpty className="py-6 text-sm text-muted-foreground">
              No inventories found
            </ComboboxEmpty>
          )}
          {inventories.map((inv) => (
            <ComboboxItem
              key={inv.id}
              value={inv.name}
              className="rounded-xl px-4 py-3 cursor-pointer transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            >
              <div className="flex w-full items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {inv.name}
                  </div>
                  {inv.address && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {inv.address}
                    </div>
                  )}
                </div>
              </div>
            </ComboboxItem>
          ))}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
