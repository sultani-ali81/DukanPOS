import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

import DateInput from "@/components/ui/DateInput";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import CustomerDialog from "@/pages/contacts/components/AddCustomerDialog";
import { ArrowLeft, Plus, User, UserPlus } from "lucide-react";

import { InlineCombobox } from "@/pages/purchases/components/inline-combobox";
import {
  purchaseFormSchema,
  type FormValues,
} from "@/pages/purchases/components/purchase-form-schema";
import { PurchaseItemRow } from "@/pages/purchases/components/purchase-item-row";

import { NumberDisplay } from "@/components/number-display";
import { useCustomers } from "@/hooks/use-customers";
import { useProductSearch } from "@/pages/purchases/components/use-product-search";
import { createCustomer } from "@/queries/customer";
import { createPurchase } from "@/queries/purchase";
import type { CreateCustomerPayload } from "@/types/customer";
import type { Suggestion } from "@/types/purchases";

export function NewPurchaseClient() {
  const navigate = useNavigate();
  const product = useProductSearch();
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerDisplay, setCustomerDisplay] = useState("");

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
  const total = watchedItems.reduce(
    (sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0),
    0,
  );

  const handleCreateCustomer = async (values: CreateCustomerPayload) => {
    await createCustomer(values);
    setCustomerDisplay(values.name);
    handleCustomerSearch(values.name);
  };

  const onSubmit = async (values: FormValues) => {
    try {
      await createPurchase({
        customerId: values.customerId,
        purchaseDate: values.purchaseDate,
        items: values.items.map((item) => ({
          productId: item.productId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      form.reset();
      navigate("/Purchases");
    } catch (err) {
      console.error("Failed to create purchase:", err);
    }
  };

  const addItem = () => {
    append({ productId: "", productName: "", quantity: 1, unitPrice: 0 });
    product.addRow();
  };

  const removeItem = (index: number) => {
    remove(index);
    product.removeRow(index);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center">
        <h1 className="text-xl font-semibold text-gray-900">New Purchase</h1>

        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-gray-500 hover:text-gray-700 ml-auto"
          onClick={() => navigate("/Purchases")}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Purchases
        </Button>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Customer + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <div className="flex gap-2">
                    <FormControl>
                      <div className="flex-1">
                        <InlineCombobox
                          displayValue={customerDisplay}
                          placeholder="Search customer..."
                          icon={<User className="w-4 h-4" />}
                          suggestions={customerSuggestions}
                          loading={customersLoading}
                          onFocus={() => handleCustomerSearch(customerDisplay)}
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
                        <TooltipContent>Add new customer</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchaseDate"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Purchase Date</FormLabel>
                  <FormControl>
                    <DateInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  {fieldState.error && (
                    <FormMessage>{fieldState.error.message}</FormMessage>
                  )}
                </FormItem>
              )}
            />
          </div>

          {/* Items */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold text-gray-700">Items</Label>

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
                  product.setSuggestions((prev) => ({ ...prev, [index]: [] }));
                  product.setActiveIndex(null);
                }}
                onRemove={() => removeItem(index)}
              />
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full rounded-xl border-dashed border-gray-300 text-gray-500 hover:text-gray-800 h-11"
              onClick={addItem}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>

            {form.formState.errors.items?.root && (
              <p className="text-xs text-red-500">
                {form.formState.errors.items.root.message}
              </p>
            )}
          </div>

          {/* Total + submit */}
          <div className="border-t border-gray-200 pt-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-lg font-bold text-gray-900">
                AFN <NumberDisplay value={total} decimals={2} />{" "}
              </p>
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className="h-11 px-8 rounded-xl bg-black text-white hover:bg-black/90 font-medium"
            >
              {form.formState.isSubmitting ? "Saving..." : "Save Purchase"}
            </Button>
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
