import { NumberDisplay } from "@/components/number-display";
import type { Control, UseFormSetValue } from "react-hook-form";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Suggestion } from "@/types/purchases";
import { Hash, Package, Trash2 } from "lucide-react";
import { InlineCombobox } from "./inline-combobox";
import type { FormValues } from "./purchase-form-schema";

interface PurchaseItemRowProps {
  index: number;
  canRemove: boolean;
  control: Control<FormValues>;
  setValue: UseFormSetValue<FormValues>;
  watchedItem: FormValues["items"][number];
  productDisplay: string;
  productSuggestions: Suggestion[];
  productLoading: boolean;
  onProductFocus: () => void;
  onProductInputChange: (v: string) => void;
  onProductSelect: (
    id: string,
    label: string,
    sub?: string,
    price?: number,
  ) => void;
  onRemove: () => void;
}

export function PurchaseItemRow({
  index,
  canRemove,
  control,
  setValue,
  watchedItem,
  productDisplay,
  productSuggestions,
  productLoading,
  onProductFocus,
  onProductInputChange,
  onProductSelect,
  onRemove,
}: PurchaseItemRowProps) {
  const lineTotal =
    Number(watchedItem?.quantity || 0) * Number(watchedItem?.unitPrice || 0);

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Product */}
      <div className="space-y-1.5">
        <Label className="text-sm text-gray-700">Product</Label>
        <Controller
          control={control}
          name={`items.${index}.productId`}
          render={({ field, fieldState }) => (
            <InlineCombobox
              selectedId={field.value}
              displayValue={productDisplay}
              placeholder="Search product…"
              icon={<Package className="w-4 h-4" />}
              suggestions={productSuggestions}
              loading={productLoading}
              onFocus={onProductFocus}
              onInputChange={(v) => {
                onProductInputChange(v);
                field.onChange("");
              }}
              onSelect={(id, label, sub, price) => {
                field.onChange(id);
                setValue(`items.${index}.productName`, label);
                onProductSelect(id, label, sub, price);
              }}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      {/* Quantity + Unit Price */}
      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={control}
          name={`items.${index}.quantity`}
          render={({ field }) => (
            <FormItem>
              <Label className="text-xs text-gray-500">Quantity</Label>
              <FormControl>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  <Input
                    type="number"
                    min={1}
                    placeholder="0"
                    className="h-11 pl-9 rounded-xl border-gray-200 text-sm"
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`items.${index}.unitPrice`}
          render={({ field }) => {
            // 1. Format raw number from form state to localized string with commas for display
            const displayValue =
              field.value !== undefined && !isNaN(field.value)
                ? new Intl.NumberFormat("en-US").format(field.value)
                : "";

            return (
              <FormItem>
                <Label className="text-xs text-gray-500">Unit Price</Label>
                <FormControl>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-600 pointer-events-none mr-4">
                      AFN
                    </span>
                    <Input
                      type="text" // 2. Must be text to allow commas
                      placeholder="0"
                      // 3. Add Tailwind font utilities to keep numbers perfectly aligned
                      className="h-11 pl-12 rounded-xl border-gray-200 text-sm font-mono tabular-nums"
                      value={displayValue}
                      onChange={(e) => {
                        const rawValue = e.target.value;

                        // 4. Strip all commas out to get raw numbers/decimals
                        const cleanValue = rawValue.replace(/,/g, "");

                        // 5. Handle empty state safely
                        if (cleanValue === "") {
                          field.onChange(NaN);
                          return;
                        }

                        // 6. Parse back to a valid floating point number for your form state
                        const parsedNumber = parseFloat(cleanValue);
                        if (!isNaN(parsedNumber)) {
                          field.onChange(parsedNumber);
                        }
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </div>

      {/* Line total + remove */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400">
          Line total:{" "}
          <span className="font-medium text-gray-700">
            <NumberDisplay value={lineTotal} decimals={2} /> AFN
          </span>
        </span>
        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 h-auto p-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </Button>
        )}
      </div>
    </div>
  );
}
