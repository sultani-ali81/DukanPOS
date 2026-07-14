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
import { useCustomers } from "@/hooks/use-customers";
import { User } from "lucide-react";
import { useState } from "react";

interface PosCustomerComboboxProps {
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
}

interface CustomerOption {
  value: string;
  label: string;
  phone?: string;
}

export function PosCustomerCombobox({
  value,
  label,
  onChange,
}: PosCustomerComboboxProps) {
  const [open, setOpen] = useState(false);

  const {
    customers,
    totalPages,
    page,
    setPage,
    handleSearch,
    isLoading,
  } = useCustomers({ pageParam: "posCustomerPage" });
  const options: CustomerOption[] = customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    phone: customer.phone,
  }));
  const selectedOption: CustomerOption | null = value
    ? {
        value,
        label:
          customers.find((customer) => customer.id === value)?.name ||
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
      itemToStringLabel={(option: CustomerOption) => option.label}
      itemToStringValue={(option: CustomerOption) => option.value}
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
      onValueChange={(option: CustomerOption | null) => {
        if (!option) return;
        onChange(option.value, option.label);
        setOpen(false);
      }}
    >
      <ComboboxInput
        placeholder="Select Customer"
        className="h-11 w-full rounded-xl border-gray-200 px-3 text-sm font-normal"
      >
        <InputGroupAddon align="inline-start">
          <User className="size-4 text-gray-400" />
        </InputGroupAddon>
      </ComboboxInput>

      <ComboboxContent className="w-[280px] overflow-hidden rounded-xl border border-gray-100 bg-white p-0 shadow-lg">
        <ComboboxList className="max-h-52 overflow-y-auto py-1">
          {isLoading ? (
            <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
          ) : (
            <ComboboxEmpty className="py-6 text-xs text-gray-400">
              No customers found
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
                {option.phone && (
                  <span className="block text-xs text-gray-400 truncate">
                    {option.phone}
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
              disabled={page <= 1 || isLoading}
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
              disabled={page >= totalPages || isLoading}
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
