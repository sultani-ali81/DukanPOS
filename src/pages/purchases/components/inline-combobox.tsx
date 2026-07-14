import { useState } from "react";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { InputGroupAddon } from "@/components/ui/input-group";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/types/purchases";

interface InlineComboboxProps {
  id?: string;
  selectedId?: string;
  displayValue: string;
  placeholder: string;
  icon: React.ReactNode;
  suggestions: Suggestion[];
  loading: boolean;
  onFocus: () => void;
  onInputChange: (v: string) => void;
  onSelect: (id: string, label: string, sub: string, price?: number) => void;
  error?: string;
  disabled?: boolean;
}

export function InlineCombobox({
  id,
  selectedId,
  displayValue,
  placeholder,
  icon,
  suggestions,
  loading,
  onFocus,
  onInputChange,
  onSelect,
  error,
  disabled,
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedSuggestion = selectedId
    ? (suggestions.find((suggestion) => suggestion.id === selectedId) ?? {
        id: selectedId,
        label: displayValue || selectedId,
      })
    : null;

  return (
    <div className="relative">
      <Combobox
        open={disabled ? false : open}
        onOpenChange={setOpen}
        items={suggestions}
        value={selectedSuggestion}
        inputValue={displayValue}
        filter={() => true}
        itemToStringLabel={(suggestion: Suggestion) => suggestion.label}
        itemToStringValue={(suggestion: Suggestion) => suggestion.id}
        isItemEqualToValue={(suggestion, selected) =>
          suggestion.id === selected.id
        }
        onInputValueChange={(nextValue, details) => {
          if (
            disabled ||
            (details.reason !== "input-change" &&
              details.reason !== "input-clear")
          ) {
            return;
          }
          onInputChange(nextValue);
          setOpen(true);
        }}
        onValueChange={(suggestion: Suggestion | null) => {
          if (disabled || !suggestion) return;
          onSelect(
            suggestion.id,
            suggestion.label,
            suggestion.sub ?? "",
            suggestion.price,
          );
          setOpen(false);
        }}
      >
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error || undefined}
          showClear={false}
          className={cn(
            "h-11 w-full rounded-xl border-gray-200 pl-2 pr-3 text-sm",
            error && "border-red-400",
          )}
          onFocus={() => {
            if (disabled) return;
            onFocus();
            setOpen(true);
          }}
        >
          <InputGroupAddon align="inline-start" className="text-gray-400">
            {icon}
          </InputGroupAddon>
        </ComboboxInput>

        <ComboboxContent className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
          <ComboboxList className="p-0">
            {loading ? (
              <p className="px-4 py-3 text-xs text-gray-400">Searching…</p>
            ) : (
              <ComboboxEmpty className="px-4 py-3 text-xs text-gray-400">
                No results
              </ComboboxEmpty>
            )}
            {suggestions.map((suggestion) => (
              <ComboboxItem
                key={suggestion.id}
                value={suggestion}
                className="rounded-none px-4 py-2.5"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-gray-800">
                    {suggestion.label}
                  </span>
                  {suggestion.sub && (
                    <span className="block truncate text-xs text-gray-400">
                      {suggestion.sub}
                    </span>
                  )}
                </span>
              </ComboboxItem>
            ))}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
