import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormLabel } from "@/components/ui/form";
import { ArrowLeft, ArrowRight, Package, Plus, Warehouse } from "lucide-react";

import { extractError } from "@/lib/error";
import { createStockMutationMatcher } from "@/lib/stock-cache";
import InventoryCombobox from "@/pages/purchases/components/inventory-combobox";
import {
  createStockMovement,
  updateStockMovement,
} from "@/queries/stock-movement";
import {
  stockMovementFormSchema,
  type StockMovementFormValues,
} from "./stock-movement-form-schema";
import { StockMovementItemRow } from "./stock-movement-item-row";
import { useInventoryProductSearch } from "./use-inventory-product-search";
import { useSWRConfig } from "swr";

interface LocationState {
  sourceInventoryId?: string;
}

export function NewStockMovementClient() {
  const navigate = useNavigate();
  const location = useLocation();
  const { mutate: mutateCache } = useSWRConfig();
  const prefill = (location.state as LocationState) ?? {};

  const form = useForm<StockMovementFormValues>({
    resolver: zodResolver(stockMovementFormSchema),
    defaultValues: {
      sourceInventoryId: prefill.sourceInventoryId ?? "",
      destinationInventoryId: "",
      items: [{ productId: "", productName: "", availableQty: 0, quantity: 1 }],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const sourceInventoryId = form.watch("sourceInventoryId");
  const destinationInventoryId = form.watch("destinationInventoryId");
  const watchedItems = form.watch("items");

  const productSearch = useInventoryProductSearch(sourceInventoryId);

  const hasItems = watchedItems.some(
    (i) => i.productId && Number(i.quantity) > 0,
  );

  const handleSourceChange = (id: string) => {
    form.setValue("sourceInventoryId", id, { shouldValidate: true });
    replace([{ productId: "", productName: "", availableQty: 0, quantity: 1 }]);
    productSearch.resetDisplays();
  };

  const addItem = () => {
    append({ productId: "", productName: "", availableQty: 0, quantity: 1 });
    productSearch.addRow();
  };

  const removeItem = (index: number) => {
    remove(index);
    productSearch.removeRow(index);
  };

  const onSubmit = async (values: StockMovementFormValues) => {
    try {
      const response = await createStockMovement({
        sourceInventoryId: values.sourceInventoryId,
        destinationInventoryId: values.destinationInventoryId,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
        })),
      });

      if (!response.stockMovementId) {
        throw new Error("Stock movement id was not returned from the server");
      }

      await updateStockMovement(
        { status: "Done" },
        response.stockMovementId,
      );

      await mutateCache(
        createStockMutationMatcher({
          inventoryIds: new Set([
            values.sourceInventoryId,
            values.destinationInventoryId,
          ]),
          productIds: new Set(values.items.map((item) => item.productId)),
        }),
        undefined,
        { revalidate: true },
      );

      toast.success("Stock transfer created", {
        description: response.message,
      });
      navigate("/inventory");
    } catch (err) {
      toast.error("Failed to create stock transfer", {
        description: extractError(err),
      });
    }
  };

  return (
    <div className="mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center">
        <div className="flex-col">
          <h1 className="text-xl font-semibold text-gray-900">
            Transfer Stock
          </h1>
          <p className="text-sm text-gray-500">
            Move products from one inventory to another
          </p>
        </div>
        <Button
          className="h-8 ml-auto"
          variant="outline"
          onClick={() => navigate("/inventory")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Inventory
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card className="overflow-visible">
            <CardHeader>
              <CardTitle>From / To</CardTitle>
            </CardHeader>
            <CardContent className="overflow-visible grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-start">
              <div className="space-y-1.5">
                <FormLabel
                  htmlFor="sourceInventoryId"
                  className="flex items-center gap-1.5"
                >
                  <Warehouse className="size-3.5" /> Source Inventory
                </FormLabel>
                <InventoryCombobox
                  id="sourceInventoryId"
                  value={sourceInventoryId}
                  onChange={handleSourceChange}
                  excludeId={destinationInventoryId}
                />
                {form.formState.errors.sourceInventoryId && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.sourceInventoryId.message}
                  </p>
                )}
              </div>

              <ArrowRight className="hidden md:block size-5 text-muted-foreground mt-8 justify-self-center" />

              <div className="space-y-1.5">
                <FormLabel
                  htmlFor="destinationInventoryId"
                  className="flex items-center gap-1.5"
                >
                  <Warehouse className="size-3.5" /> Destination Inventory
                </FormLabel>
                <InventoryCombobox
                  id="destinationInventoryId"
                  value={destinationInventoryId}
                  onChange={(id) =>
                    form.setValue("destinationInventoryId", id, {
                      shouldValidate: true,
                    })
                  }
                  excludeId={sourceInventoryId}
                />
                {form.formState.errors.destinationInventoryId && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.destinationInventoryId.message}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Items to Transfer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {!sourceInventoryId ? (
                <p className="text-sm text-muted-foreground">
                  Select a source inventory to choose products.
                </p>
              ) : (
                <>
                  {fields.map((field, index) => (
                    <StockMovementItemRow
                      key={field.id}
                      index={index}
                      canRemove={fields.length > 1}
                      control={form.control}
                      setValue={form.setValue}
                      watchedItem={watchedItems[index]}
                      productDisplay={productSearch.displays[index] ?? ""}
                      productSuggestions={productSearch.suggestionsFor(
                        productSearch.displays[index] ?? "",
                      )}
                      productLoading={productSearch.isLoading}
                      onProductFocus={() => productSearch.setActiveIndex(index)}
                      onProductInputChange={(v) => {
                        productSearch.updateDisplay(index, v);
                        productSearch.setActiveIndex(index);
                      }}
                      onProductSelect={(id, label) => {
                        const meta = productSearch.metaById.get(id);
                        form.setValue(
                          `items.${index}.availableQty`,
                          meta?.availableQty ?? 0,
                        );
                        productSearch.updateDisplay(index, label);
                        productSearch.setActiveIndex(null);
                      }}
                      onRemove={() => removeItem(index)}
                    />
                  ))}

                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-2" /> Add Item
                  </Button>
                </>
              )}

              {form.formState.errors.items?.root && (
                <p className="text-xs text-red-500">
                  {form.formState.errors.items.root.message}
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              size="lg"
              className="h-12 gap-1.5"
              disabled={
                form.formState.isSubmitting ||
                !sourceInventoryId ||
                !destinationInventoryId ||
                !hasItems
              }
            >
              <Package className="size-4" />
              {form.formState.isSubmitting
                ? "Transferring..."
                : "Transfer Stock"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
