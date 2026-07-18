import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";

import type { Inventory } from "@/queries/inventory";
import { getInventories, getInventory } from "@/queries/inventory";
import useSWR from "swr";
import { useDebounce } from "use-debounce";

interface InventoryOption {
  value: string;
  label: string;
  address?: string;
}

const EMPTY_INVENTORIES: Inventory[] = [];

interface InventoryComboboxProps {
  id?: string;
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  excludeId?: string;
  itemsPerPage?: number;
}

export default function InventoryCombobox({
  id,
  value,
  onChange,
  disabled,
  excludeId,
  itemsPerPage = 8,
}: InventoryComboboxProps) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const [debouncedSearch] = useDebounce(search, 400);
  const { data: selectedInventory } = useSWR(
    value ? ["inventory-detail", value] : null,
    ([, inventoryId]) => getInventory(inventoryId),
  );
  const { data: inventoryData, isLoading: loading } = useSWR(
    open
      ? ([
          "inventories",
          {
            page: 1,
            itemsPerPage,
            search: debouncedSearch.trim() || undefined,
          },
        ] as const)
      : null,
    ([, params]) => getInventories(params),
  );
  const inventories = inventoryData?.data ?? EMPTY_INVENTORIES;

  const visibleInventories = excludeId
    ? inventories.filter((inv) => inv.id !== excludeId)
    : inventories;

  const options: InventoryOption[] = visibleInventories.map((inventory) => ({
    value: inventory.id,
    label: inventory.name,
    address: inventory.address,
  }));
  const selectedFromPage = inventories.find(
    (inventory) => inventory.id === value,
  );
  const selectedName = selectedFromPage?.name ?? selectedInventory?.name ?? "";
  const selectedOption: InventoryOption | null = value
    ? { value, label: selectedName || value }
    : null;

  return (
    <Combobox
      open={disabled ? false : open}
      onOpenChange={setOpen}
      items={options}
      value={selectedOption}
      filter={() => true}
      itemToStringLabel={(option: InventoryOption) => option.label}
      itemToStringValue={(option: InventoryOption) => option.value}
      isItemEqualToValue={(option, selected) =>
        option.value === selected.value
      }
      onValueChange={(option: InventoryOption | null) => {
        if (disabled) return;
        onChange(option?.value ?? "");
        setSearch("");
      }}
    >
      <ComboboxInput
        id={id}
        placeholder={selectedName || "Select inventory..."}
        onChange={(e) => {
          if (disabled) return;
          setSearch(e.target.value);
        }}
        disabled={disabled}
        showClear={!!value && !disabled}
        className="h-10 rounded-xl border border-gray-200 bg-transparent px-3 text-sm shadow-none focus:border-gray-300 focus:ring-3 focus:ring-gray-100"
      />

      <ComboboxContent className="w-[var(--anchor-width)] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
        <ComboboxList className="max-h-80 overflow-y-auto p-1">
          {loading && (
            <div className="px-4 py-3 text-sm text-muted-foreground">
              Searching...
            </div>
          )}
          {!loading && visibleInventories.length === 0 && (
            <ComboboxEmpty className="py-6 text-sm text-muted-foreground">
              No inventories found
            </ComboboxEmpty>
          )}
          {options.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option}
              className="rounded-xl px-4 py-3 cursor-pointer transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
            >
              <div className="flex w-full items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">
                    {option.label}
                  </div>
                  {option.address && (
                    <div className="mt-1 truncate text-xs text-muted-foreground">
                      {option.address}
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
