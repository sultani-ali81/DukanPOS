import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Inventory } from "@/types/inventory";
import { Loader2, Warehouse } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

export interface InventoryFormValues {
  name: string;
  address: string;
}

interface InventoryDialogProps {
  open: boolean;
  editingInventory: Inventory | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InventoryFormValues, id?: string) => Promise<void>;
}

export function InventoryDialog({
  open,
  editingInventory,
  onOpenChange,
  onSubmit,
}: InventoryDialogProps) {
  const isEdit = !!editingInventory;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InventoryFormValues>({
    defaultValues: {
      name: editingInventory?.name ?? "",
      address: editingInventory?.address ?? "",
    },
  });

  useState(() => {
    reset({
      name: editingInventory?.name ?? "",
      address: editingInventory?.address ?? "",
    });
  });

  async function submit(values: InventoryFormValues) {
    await onSubmit(values, editingInventory?.id);
    onOpenChange(false);
    reset({ name: "", address: "" });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Warehouse className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold">
                  {isEdit ? "Edit Inventory" : "Add Inventory"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isEdit
                    ? `Update details for "${editingInventory.name}".`
                    : "Create a new store, warehouse, or branch."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Main Warehouse"
                className="h-11 rounded-xl border-gray-200 text-sm"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                placeholder="e.g. Shahr-e Naw, Kabul"
                className="h-11 rounded-xl border-gray-200 text-sm"
                {...register("address", { required: "Address is required" })}
              />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 h-11 rounded-xl text-sm font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin mr-2" />}
              {isEdit ? "Save Changes" : "Create Inventory"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
