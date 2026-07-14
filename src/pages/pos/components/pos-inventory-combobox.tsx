import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import type { Inventory } from "@/queries/inventory";
import { getInventories } from "@/queries/inventory";
import { Warehouse } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

const PAGE_SIZE = 8;
const EMPTY_INVENTORIES: Inventory[] = [];

interface InventoryOption {
  value: string;
  label: string;
  address?: string;
}

interface PosInventoryComboboxProps {
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
}

export function PosInventoryCombobox({
  value,
  label,
  onChange,
}: PosInventoryComboboxProps) {
  const [open, setOpen] = useState(false);

  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
    pageParam: "posInventoryPage",
  });
  const { debouncedSearch, handleSearch } = useSearch({
    onSearch: resetToPage1,
  });

  const { data, isLoading: loading } = useSWR(
    open
      ? ([
          "inventories",
          { search: debouncedSearch, page, itemsPerPage: PAGE_SIZE },
        ] as const)
      : null,
    ([, params]) => getInventories(params),
  );
  const inventories = data?.data ?? EMPTY_INVENTORIES;
  const totalPages = data?.meta.totalPages ?? 1;
  const options: InventoryOption[] = inventories.map((inventory) => ({
    value: inventory.id,
    label: inventory.name,
    address: inventory.address,
  }));
  const selectedOption: InventoryOption | null = value
    ? {
        value,
        label:
          inventories.find((inventory) => inventory.id === value)?.name ||
          label ||
          value,
      }
    : null;

  return (
    <Combobox
      open={open}
      onOpenChange={setOpen}
      items={options}
      value={selectedOption}
      filter={() => true}
      itemToStringLabel={(option: InventoryOption) => option.label}
      itemToStringValue={(option: InventoryOption) => option.value}
      isItemEqualToValue={(option, selected) =>
        option.value === selected.value
      }
      onInputValueChange={(nextSearch, details) => {
        if (
          details.reason === "input-change" ||
          details.reason === "input-clear"
        ) {
          handleSearch(nextSearch);
        }
      }}
      onValueChange={(option: InventoryOption | null) => {
        if (!option) return;
        onChange(option.value, option.label);
        setOpen(false);
      }}
    >
      <ComboboxInput
        placeholder="Select Inventory"
        className="h-11 w-full rounded-xl border-gray-200 px-3 text-sm font-normal"
      >
        <InputGroupAddon align="inline-start">
          <Warehouse className="size-4 text-gray-400" />
        </InputGroupAddon>
      </ComboboxInput>

      <ComboboxContent className="w-[280px] overflow-hidden rounded-xl border border-gray-100 bg-white p-0">
        <ComboboxList className="max-h-52 overflow-y-auto py-1">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
          ) : (
            <ComboboxEmpty className="py-6 text-xs text-gray-400">
              No inventories found
            </ComboboxEmpty>
          )}
          {options.map((option) => (
            <ComboboxItem
              key={option.value}
              value={option}
              className="px-3 py-2 text-sm text-gray-700 data-selected:bg-blue-50/50 data-selected:font-medium data-selected:text-blue-600"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">
                  {option.label}
                </span>
                {option.address && (
                  <span className="block text-xs text-gray-400 truncate">
                    {option.address}
                  </span>
                )}
              </span>
            </ComboboxItem>
          ))}
        </ComboboxList>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span className="text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </ComboboxContent>
    </Combobox>
  );
}
