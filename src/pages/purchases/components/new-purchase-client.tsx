import { useNewPurchaseDraftStore } from "@/lib/newPurchaseDraftStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { useDebounce } from "use-debounce";
import { useShallow } from "zustand/react/shallow";

import { NumberDisplay } from "@/components/number-display";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { extractError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { InlineCombobox } from "@/pages/purchases/components/inline-combobox";
import InventoryCombobox from "@/pages/purchases/components/inventory-combobox";
import {
  moneyEquals,
  purchaseItemsTotal,
  roundMoney,
} from "@/pages/purchases/purchase-utils";
import { getCustomers } from "@/queries/customer";
import { createPurchase } from "@/queries/purchase";
import { hasSession } from "@/queries/session";
import type { PurchasePaymentStatus, Suggestion } from "@/types/purchases";
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Package,
  Plus,
  User,
  Warehouse,
} from "lucide-react";
import { PurchaseItemRow } from "./purchase-item-row";
import {
  purchaseFormSchema,
  type FormValues,
} from "./purchase-form-schema";
import { useProductSearch } from "./use-product-search";

const DEFAULT_VALUES: FormValues = {
  customerId: "",
  purchaseDate: "",
  paymentStatus: "unpaid",
  amount: 0,
  items: [{ productId: "", productName: "", quantity: 1, unitPrice: 0 }],
};

const PAYMENT_OPTIONS: Array<{
  value: PurchasePaymentStatus;
  label: string;
}> = [
  { value: "unpaid", label: "Unpaid" },
  { value: "partially_paid", label: "Partially paid" },
  { value: "fully_paid", label: "Fully paid" },
];

type StepState = "done" | "active" | "pending";

interface FlowStep {
  label: string;
  description: string;
  state: StepState;
}

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
  const supplierAndDateReady = hasSupplier && hasDate;
  const steps: FlowStep[] = [
    {
      label: "Supplier & date",
      description: "Choose the supplier and purchase date",
      state: supplierAndDateReady ? "done" : "active",
    },
    {
      label: "Inventory",
      description: "Choose where this purchase belongs",
      state: !supplierAndDateReady ? "pending" : hasInventory ? "done" : "active",
    },
    {
      label: "Items & payment",
      description: "Add products and choose the initial payment",
      state: !supplierAndDateReady ? "pending" : hasItems ? "done" : "active",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.label} className="flex gap-3">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold",
                step.state === "done"
                  ? "border-primary bg-primary text-primary-foreground"
                  : step.state === "active"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-muted-foreground/30 text-muted-foreground/40",
              )}
            >
              {step.state === "done" ? <CheckCircle2 className="size-4" /> : index + 1}
            </div>
            <div>
              <p
                className={cn(
                  "text-sm font-semibold",
                  step.state === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {step.description}
              </p>
            </div>
          </div>
        ))}

        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground">Purchase total</p>
          <p className="mt-1 text-lg font-bold tabular-nums text-foreground">
            AFN <NumberDisplay value={total} decimals={2} />
          </p>
        </div>

        <Button
          type="submit"
          form="new-purchase-form"
          disabled={
            isSubmitting ||
            !hasSupplier ||
            !hasDate ||
            !hasInventory ||
            !hasItems
          }
          size="lg"
          className="h-12 w-full gap-1.5"
        >
          <Package className="size-4" />
          {isSubmitting ? "Saving…" : "Create purchase"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function NewPurchaseClient() {
  const navigate = useNavigate();
  const { mutate: mutateCache } = useSWRConfig();
  const { getFreshDraft, setDraft, markLeft, clearDraft } =
    useNewPurchaseDraftStore(
      useShallow((state) => ({
        getFreshDraft: state.getFreshDraft,
        setDraft: state.setDraft,
        markLeft: state.markLeft,
        clearDraft: state.clearDraft,
      })),
    );
  const [initialDraft] = useState(() => getFreshDraft());
  const [initialValues] = useState<FormValues>(() => {
    const persisted = initialDraft?.values as Partial<FormValues> | undefined;
    return {
      ...DEFAULT_VALUES,
      ...persisted,
      items: persisted?.items?.length ? persisted.items : DEFAULT_VALUES.items,
      paymentStatus: persisted?.paymentStatus ?? "unpaid",
      amount:
        typeof persisted?.amount === "number" && Number.isFinite(persisted.amount)
          ? persisted.amount
          : 0,
    };
  });
  const product = useProductSearch(initialDraft?.productDisplays ?? [""]);
  const [supplierDisplay, setSupplierDisplay] = useState(
    () => initialDraft?.customerDisplay ?? "",
  );
  const [supplierSearch, setSupplierSearch] = useState(
    () => initialDraft?.customerDisplay ?? "",
  );
  const [inventoryId, setInventoryId] = useState(
    () => initialDraft?.inventoryId ?? "",
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [debouncedSupplierSearch] = useDebounce(supplierSearch.trim(), 300);

  const { data: suppliersData, isLoading: suppliersLoading } = useSWR(
    [
      "purchase-suppliers",
      {
        page: 1,
        itemsPerPage: 100,
        search: debouncedSupplierSearch || undefined,
      },
    ] as const,
    ([, params]) => getCustomers(params),
  );
  const customerSuggestions: Suggestion[] = (suppliersData?.data ?? []).map(
    (customer) => ({
      id: customer.id,
      label: customer.name,
      sub: customer.phone,
    }),
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: initialValues,
  });
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const watchedItems = useWatch({
    control: form.control,
    name: "items",
  }) ?? DEFAULT_VALUES.items;
  const watchedCustomerId = useWatch({
    control: form.control,
    name: "customerId",
  });
  const watchedDate = useWatch({
    control: form.control,
    name: "purchaseDate",
  });
  const watchedPaymentStatus = useWatch({
    control: form.control,
    name: "paymentStatus",
  });
  const watchedPaymentAmount = useWatch({
    control: form.control,
    name: "amount",
  });
  const total = purchaseItemsTotal(watchedItems);
  const hasSupplier = Boolean(watchedCustomerId);
  const hasDate = Boolean(watchedDate);
  const hasInventory = Boolean(inventoryId);
  const hasItems =
    watchedItems.length > 0 &&
    watchedItems.every(
      (item) =>
        Boolean(item.productId) &&
        Number.isFinite(Number(item.quantity)) &&
        Number(item.quantity) > 0 &&
        Number.isFinite(Number(item.unitPrice)) &&
        Number(item.unitPrice) >= 0,
    ) &&
    new Set(watchedItems.map((item) => item.productId)).size ===
      watchedItems.length;

  useEffect(() => {
    if (watchedPaymentStatus === "unpaid") {
      form.setValue("amount", 0, { shouldValidate: true });
    }
    if (watchedPaymentStatus === "fully_paid") {
      form.setValue("amount", total, { shouldValidate: true });
    }
  }, [form, total, watchedPaymentStatus]);

  useEffect(() => {
    return () => markLeft();
  }, [markLeft]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDraft({
        values: form.getValues(),
        customerDisplay: supplierDisplay,
        inventoryId,
        productDisplays: product.displays,
      });
    }, 400);
    return () => window.clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    watchedItems,
    watchedCustomerId,
    watchedDate,
    watchedPaymentStatus,
    watchedPaymentAmount,
    supplierDisplay,
    inventoryId,
    product.displays,
  ]);

  const addItem = () => {
    append({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
    product.addRow();
  };

  const removeItem = (index: number) => {
    remove(index);
    product.removeRow(index);
  };

  const validateInitialPayment = (
    status: PurchasePaymentStatus,
    amount: number,
    purchaseTotal: number,
  ): string | null => {
    if (!Number.isFinite(amount) || amount < 0) {
      return "Enter a valid payment amount.";
    }
    if (status === "unpaid") return null;
    if (status === "partially_paid") {
      if (amount <= 0) return "A partial payment must be greater than zero.";
      if (amount >= purchaseTotal) {
        return "A partial payment must be less than the purchase total.";
      }
      return null;
    }
    return moneyEquals(amount, purchaseTotal)
      ? null
      : "A fully paid purchase must receive the full purchase total.";
  };

  const onSubmit = async (values: FormValues) => {
    setSubmitError(null);
    if (!inventoryId) {
      setSubmitError("Select an inventory before creating the purchase.");
      return;
    }

    const items = values.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: roundMoney(Number(item.unitPrice)),
    }));
    const purchaseTotal = purchaseItemsTotal(items);
    const initialAmount =
      values.paymentStatus === "unpaid"
        ? 0
        : values.paymentStatus === "fully_paid"
          ? purchaseTotal
          : roundMoney(Number(values.amount));
    const paymentError = validateInitialPayment(
      values.paymentStatus,
      initialAmount,
      purchaseTotal,
    );

    if (paymentError) {
      form.setError("amount", { message: paymentError });
      return;
    }

    if (initialAmount > 0) {
      try {
        const activeSession = await hasSession();
        if (!activeSession) {
          const message =
            "Open a store session before recording a purchase payment.";
          form.setError("amount", { message });
          setSubmitError(message);
          return;
        }
      } catch (error: unknown) {
        const message = extractError(
          error,
          "Unable to verify the active store session.",
        );
        form.setError("amount", { message });
        setSubmitError(message);
        return;
      }
    }

    try {
      const result = await createPurchase({
        customerId: values.customerId,
        inventoryId,
        customDate: values.purchaseDate,
        paymentStatus: values.paymentStatus,
        amount: initialAmount,
        items,
      });

      await mutateCache(createCrudFamilyMatcher("purchases", result.purchaseId));
      clearDraft();
      toast.success("Purchase created", {
        description: result.message || "Purchase created successfully.",
      });
      navigate(`/purchases/${result.purchaseId}`);
    } catch (error: unknown) {
      setSubmitError(extractError(error, "Failed to create purchase."));
    }
  };

  return (
    <div className="mx-auto space-y-8 px-4 py-8">
      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground">New purchase</h1>
          <p className="text-sm text-muted-foreground">
            Record supplier items, inventory, and the initial payment.
          </p>
        </div>
        <Button
          type="button"
          className="ml-auto"
          variant="outline"
          onClick={() => navigate("/purchases")}
        >
          <ArrowLeft className="size-4" /> Purchases
        </Button>
      </div>

      {submitError && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {submitError}
        </div>
      )}

      <Form {...form}>
        <form
          id="new-purchase-form"
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-6 lg:grid-cols-3"
        >
          <div className="space-y-6 lg:col-span-2">
            <Card className="overflow-visible">
              <CardHeader>
                <CardTitle>Purchase information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 overflow-visible">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field, fieldState }) => (
                      <FormItem>
                        <FormLabel htmlFor="supplier">Supplier</FormLabel>
                        <FormControl>
                          <InlineCombobox
                            id="supplier"
                            selectedId={field.value}
                            displayValue={supplierDisplay}
                            placeholder="Search suppliers…"
                            icon={<User className="size-4" />}
                            suggestions={customerSuggestions}
                            loading={suppliersLoading}
                            onFocus={() => setSupplierSearch(supplierDisplay)}
                            onInputChange={(value) => {
                              setSupplierDisplay(value);
                              setSupplierSearch(value);
                              field.onChange("");
                            }}
                            onSelect={(id, label) => {
                              field.onChange(id);
                              setSupplierDisplay(label);
                              setSupplierSearch(label);
                            }}
                            error={fieldState.error?.message}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="purchaseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="purchaseDate">Purchase date</FormLabel>
                        <FormControl>
                          <DateInput
                            id="purchaseDate"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-1.5">
                  <FormLabel
                    htmlFor="inventoryId"
                    className="flex items-center gap-1.5"
                  >
                    <Warehouse className="size-3.5" /> Inventory
                  </FormLabel>
                  <InventoryCombobox
                    id="inventoryId"
                    value={inventoryId}
                    onChange={setInventoryId}
                    itemsPerPage={100}
                  />
                  {!hasInventory && form.formState.isSubmitted && (
                    <p className="text-sm font-medium text-destructive">
                      Select an inventory.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

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
                    onProductInputChange={(value) => {
                      product.setDisplays((previous) => {
                        const next = [...previous];
                        next[index] = value;
                        return next;
                      });
                      product.setActiveIndex(index);
                    }}
                    onProductSelect={(_id, label, _sub, price) => {
                      if (price !== undefined && Number.isFinite(price)) {
                        form.setValue(`items.${index}.unitPrice`, roundMoney(price), {
                          shouldValidate: true,
                        });
                      }
                      product.setDisplays((previous) => {
                        const next = [...previous];
                        next[index] = label;
                        return next;
                      });
                      product.setActiveIndex(null);
                    }}
                    onRemove={() => removeItem(index)}
                  />
                ))}

                <Button type="button" variant="outline" onClick={addItem}>
                  <Plus className="size-4" /> Add item
                </Button>

                {form.formState.errors.items?.root && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.items.root.message}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="size-5" /> Initial payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="paymentStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value as PurchasePaymentStatus);
                          form.clearErrors("amount");
                        }}
                      >
                        <FormControl>
                          <SelectTrigger aria-label="Initial payment status" className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PAYMENT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial payment amount (AFN)</FormLabel>
                      <FormControl>
                        <input
                          type="number"
                          inputMode="decimal"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                          value={Number.isFinite(field.value) ? field.value : ""}
                          disabled={watchedPaymentStatus === "unpaid" || watchedPaymentStatus === "fully_paid"}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value === ""
                                ? Number.NaN
                                : event.target.valueAsNumber,
                            )
                          }
                        />
                      </FormControl>
                      {watchedPaymentStatus === "unpaid" ? (
                        <p className="text-xs text-muted-foreground">
                          No payment will be recorded when the purchase is created.
                        </p>
                      ) : watchedPaymentStatus === "fully_paid" ? (
                        <p className="text-xs text-muted-foreground">
                          The full purchase total is recorded automatically.
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Enter an amount greater than zero and less than AFN {total.toFixed(2)}.
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>

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
    </div>
  );
}
