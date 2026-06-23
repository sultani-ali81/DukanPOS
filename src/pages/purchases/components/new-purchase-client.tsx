import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import DateInput from "@/components/ui/DateInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CustomerDialog from "@/pages/contacts/components/AddCustomerDialog";
import {
  ArrowLeft,
  CheckCircle2,
  Package,
  Plus,
  User,
  UserPlus,
  Warehouse,
} from "lucide-react";

import { NumberDisplay } from "@/components/number-display";
import { useCustomers } from "@/hooks/use-customers";
import { extractError } from "@/lib/error";
import { InlineCombobox } from "@/pages/purchases/components/inline-combobox";
import InventoryCombobox from "@/pages/purchases/components/inventory-combobox";
import {
  purchaseFormSchema,
  type FormValues,
} from "@/pages/purchases/components/purchase-form-schema";
import { PurchaseItemRow } from "@/pages/purchases/components/purchase-item-row";
import { useProductSearch } from "@/pages/purchases/components/use-product-search";
import { createCustomer } from "@/queries/customer";
import { createPurchase } from "@/queries/purchase";
import type { CreateCustomerPayload } from "@/types/customer";
import type { Suggestion } from "@/types/purchases";

// ── Types ─────────────────────────────────────────────────────────────────────

type StepState = "done" | "active" | "pending";

interface FlowStep {
  label: string;
  description: string;
  state: StepState;
}

// ── Flow stepper sidebar ──────────────────────────────────────────────────────

function NewPurchaseFlowCard({
  hasSupplier,
  hasDate,
  hasItems,
  hasInventory,
  total,
  isSubmitting,
}: {
  hasSupplier: boolean;
  hasDate: boolean;
  hasItems: boolean;
  hasInventory: boolean;
  total: number;
  isSubmitting: boolean;
}) {
  const steps: FlowStep[] = [
    {
      label: "Supplier & Date",
      description: "Select a supplier and purchase date",
      state: hasSupplier && hasDate ? "done" : "active",
    },
    {
      label: "Add Items",
      description: "Add products with quantities and prices",
      state: !(hasSupplier && hasDate)
        ? "pending"
        : hasItems
          ? "done"
          : "active",
    },
    {
      label: "Select Inventory",
      description: "Choose where items will be stocked in",
      state: !hasItems ? "pending" : hasInventory ? "done" : "active",
    },
    {
      label: "Ready to Save",
      description: "Review and save the purchase",
      state:
        hasSupplier && hasDate && hasItems && hasInventory
          ? "active"
          : "pending",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, idx, arr) => {
          const isLast = idx === arr.length - 1;
          return (
            <div key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-8 items-center justify-center rounded-full border-2 transition-all shrink-0 text-xs font-bold ${
                    step.state === "done"
                      ? "border-primary bg-primary text-white"
                      : step.state === "active"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground/30"
                  }`}
                >
                  {step.state === "done" ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                {!isLast && (
                  <div
                    className={`mt-1 w-0.5 flex-1 min-h-5 ${
                      step.state === "done"
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
              <div className="pb-4">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    step.state === "pending"
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {step.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}

        {total > 0 && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-1">
            <p className="text-xs text-muted-foreground">Estimated Total</p>
            <p className="text-lg font-bold text-foreground">
              AFN <NumberDisplay value={total} decimals={2} />
            </p>
          </div>
        )}

        <Button
          type="submit"
          form="new-purchase-form"
          disabled={
            isSubmitting ||
            !hasSupplier ||
            !hasDate ||
            !hasItems ||
            !hasInventory
          }
          size="lg"
          className="h-12 w-full gap-1.5"
        >
          <Package className="size-4" />
          {isSubmitting ? "Saving..." : "Save Purchase"}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function NewPurchaseClient() {
  const navigate = useNavigate();
  const product = useProductSearch();

  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDisplay, setCustomerDisplay] = useState("");
  const [inventoryId, setInventoryId] = useState("");

  const {
    customers,
    isLoading: customersLoading,
    handleSearch: handleCustomerSearch,
  } = useCustomers();

  const customerSuggestions: Suggestion[] = customers.map((c) => ({
    id: c.id,
    label: c.name,
    sub: c.phone,
  }));

  const form = useForm<FormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      customerId: "",
      purchaseDate: "",
      items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = form.watch("items");
  const watchedCustomerId = form.watch("customerId");
  const watchedDate = form.watch("purchaseDate");

  const total = watchedItems.reduce(
    (sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0,
  );

  const hasSupplier = !!watchedCustomerId;
  const hasDate = !!watchedDate;
  const hasItems = watchedItems.some(
    (i) => i.productId && Number(i.quantity) > 0 && Number(i.unitPrice) > 0,
  );
  const hasInventory = !!inventoryId;

  const handleCreateCustomer = async (values: CreateCustomerPayload) => {
    await createCustomer(values);
    setCustomerDisplay(values.name);
    handleCustomerSearch(values.name);
  };

  const addItem = () => {
    append({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
    product.addRow();
  };

  const removeItem = (index: number) => {
    remove(index);
    product.removeRow(index);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      const result = await createPurchase({
        customerId: values.customerId,
        purchaseDate: values.purchaseDate,
        inventoryId: inventoryId || undefined,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });

      toast.success("Purchase saved", {
        description: `Purchase created as draft.`,
      });

      navigate(`/purchases/${result.purchaseId}`, {
        state: { inventoryId },
      });
    } catch (err) {
      toast.error("Failed to save purchase", {
        description: extractError(err),
      });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center">
        <div className="flex-col">
          <h1 className="text-xl font-semibold text-gray-900">New Purchase</h1>
          <p className="text-sm text-gray-500">
            Add products and assign them to an inventory
          </p>
        </div>
        <Button
          className="h-8 ml-auto"
          variant="outline"
          onClick={() => navigate("/purchases")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Purchases
        </Button>
      </div>

      <Form {...form}>
        <form
          id="new-purchase-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-3"
        >
          {/* ── Left: form fields ── */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle>Purchase Info</CardTitle>
              </CardHeader>
              <CardContent className="overflow-visible space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Supplier */}
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Supplier</FormLabel>
                        <div className="flex gap-2">
                          <FormControl>
                            <div className="flex-1">
                              <InlineCombobox
                                displayValue={customerDisplay}
                                placeholder="Search supplier..."
                                icon={<User className="w-4 h-4" />}
                                suggestions={customerSuggestions}
                                loading={customersLoading}
                                onFocus={() =>
                                  handleCustomerSearch(customerDisplay)
                                }
                                onInputChange={(v) => {
                                  setCustomerDisplay(v);
                                  handleCustomerSearch(v);
                                  field.onChange("");
                                }}
                                onSelect={(id, label) => {
                                  field.onChange(id);
                                  setCustomerDisplay(label);
                                }}
                                error={fieldState.error?.message}
                              />
                            </div>
                          </FormControl>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="icon"
                                  className="h-11 w-11 rounded-xl border-gray-200 shrink-0"
                                  onClick={() => setCustomerDialogOpen(true)}
                                >
                                  <UserPlus className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Add new supplier</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Date */}
                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel>Purchase Date</FormLabel>
                        <FormControl>
                          <DateInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        {fieldState.error && (
                          <FormMessage>{fieldState.error.message}</FormMessage>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

                {/* Inventory */}
                <div className="space-y-1.5">
                  <FormLabel className="flex items-center gap-1.5">
                    <Warehouse className="size-3.5" /> Destination Inventory
                  </FormLabel>
                  <InventoryCombobox
                    value={inventoryId}
                    onChange={setInventoryId}
                  />
                  <p className="text-xs text-muted-foreground">
                    Items will be stocked into this inventory after
                    confirmation.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Items */}
            <Card>
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {fields.map((field, index) => (
                  <PurchaseItemRow
                    key={field.id}
                    index={index}
                    canRemove={fields.length > 1}
                    control={form.control}
                    setValue={form.setValue}
                    watchedItem={watchedItems[index]}
                    productDisplay={product.displays[index] ?? ""}
                    productSuggestions={product.suggestions[index] ?? []}
                    productLoading={product.loadingMap[index] ?? false}
                    onProductFocus={() => product.setActiveIndex(index)}
                    onProductInputChange={(v) => {
                      product.setDisplays((prev) => {
                        const next = [...prev];
                        next[index] = v;
                        return next;
                      });
                      product.setActiveIndex(index);
                    }}
                    onProductSelect={(_id, label, sub) => {
                      if (sub) {
                        const price = Number(sub.replace(/[^0-9]/g, ""));
                        if (!isNaN(price))
                          form.setValue(`items.${index}.unitPrice`, price);
                      }
                      product.setDisplays((prev) => {
                        const next = [...prev];
                        next[index] = label;
                        return next;
                      });
                      product.setSuggestions((prev) => ({
                        ...prev,
                        [index]: [],
                      }));
                      product.setActiveIndex(null);
                    }}
                    onRemove={() => removeItem(index)}
                  />
                ))}

                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>

                {form.formState.errors.items?.root && (
                  <p className="text-xs text-red-500">
                    {form.formState.errors.items.root.message}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Right: flow stepper ── */}
          <div className="space-y-6">
            <NewPurchaseFlowCard
              hasSupplier={hasSupplier}
              hasDate={hasDate}
              hasItems={hasItems}
              hasInventory={hasInventory}
              total={total}
              isSubmitting={form.formState.isSubmitting}
            />
          </div>
        </form>
      </Form>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSubmit={handleCreateCustomer}
      />
    </div>
  );
}
