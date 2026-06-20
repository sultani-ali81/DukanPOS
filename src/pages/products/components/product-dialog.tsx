"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { categories } from "@/lib/data";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

interface ProductFormValues {
  name: string;
  price: number;
  categoryName: string;
  barcode?: string;
}

interface ProductDialogProps {
  open: boolean;
  editingProduct?: {
    id: string;
    name: string;
    price: number;
    category?: string;
    barcode?: string;
  } | null;
  categories: { id: string; name: string }[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues, id?: string) => Promise<void>;
}

export function ProductDialog({
  open,
  editingProduct,
  onOpenChange,
  onSubmit,
}: ProductDialogProps) {
  const isEdit = !!editingProduct;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: editingProduct?.name ?? "",
      price: editingProduct?.price ?? 0,
      categoryName: editingProduct?.category ?? "",
      barcode: editingProduct?.barcode ?? "",
    },
  });

  async function submit(values: ProductFormValues) {
    await onSubmit(values, editingProduct?.id);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Update details for "${editingProduct.name}".`
                : "Enter the product details to add it to your catalog."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="p-name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-name"
                placeholder="e.g. Basmati Rice 5kg"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="p-barcode">Barcode</Label>
              <Input
                id="p-barcode"
                placeholder="Scan or enter barcode"
                {...register("barcode")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="p-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <select
                id="p-category"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                {...register("categoryName", {
                  required: "Category is required",
                })}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.categoryName && (
                <p className="text-xs text-destructive">
                  {errors.categoryName.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="p-price">
                Selling Price <span className="text-destructive">*</span>
              </Label>
              <Input
                id="p-price"
                type="number"
                placeholder="0"
                min="0"
                {...register("price", {
                  required: "Price is required",
                  valueAsNumber: true,
                  min: { value: 0, message: "Price must be 0 or more" },
                })}
              />
              {errors.price && (
                <p className="text-xs text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
