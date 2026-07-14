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
import { cn } from "@/lib/utils";
import { InlineCombobox } from "@/pages/purchases/components/inline-combobox";
import type { Suggestion } from "@/types/purchases";
import { Hash, Package, Trash2 } from "lucide-react";
import type { StockMovementFormValues } from "./stock-movement-form-schema";

interface StockMovementItemRowProps {
  index: number;
  canRemove: boolean;
  control: Control<StockMovementFormValues>;
  setValue: UseFormSetValue<StockMovementFormValues>;
  watchedItem: StockMovementFormValues["items"][number];
  productDisplay: string;
  productSuggestions: Suggestion[];
  productLoading: boolean;
  onProductFocus: () => void;
  onProductInputChange: (v: string) => void;
  onProductSelect: (id: string, label: string) => void;
  onRemove: () => void;
}

export function StockMovementItemRow({
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
}: StockMovementItemRowProps) {
  const availableQty = watchedItem?.availableQty ?? 0;
  const exceedsStock = Number(watchedItem?.quantity || 0) > availableQty;

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
              placeholder="Search product in source inventory…"
              icon={<Package className="w-4 h-4" />}
              suggestions={productSuggestions}
              loading={productLoading}
              onFocus={onProductFocus}
              onInputChange={(v) => {
                onProductInputChange(v);
                field.onChange("");
              }}
              onSelect={(id, label) => {
                field.onChange(id);
                setValue(`items.${index}.productName`, label);
                onProductSelect(id, label);
              }}
              error={fieldState.error?.message}
            />
          )}
        />
      </div>

      {/* Quantity */}
      <FormField
        control={control}
        name={`items.${index}.quantity`}
        render={({ field }) => (
          <FormItem>
            <Label className="text-xs text-gray-500">
              Quantity to transfer
              {availableQty > 0 && (
                <span className="text-muted-foreground">
                  {" "}
                  ({availableQty} available)
                </span>
              )}
            </Label>
            <FormControl>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                <Input
                  type="number"
                  min={1}
                  max={availableQty || undefined}
                  placeholder="0"
                  className={cn(
                    "h-11 pl-9 rounded-xl border-gray-200 text-sm",
                    exceedsStock && "border-red-400",
                  )}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.valueAsNumber)}
                />
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {canRemove && (
        <div className="flex justify-end pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 h-auto p-0"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </Button>
        </div>
      )}
    </div>
  );
}
