import { Button } from "@/components/ui/button";
import {
  CompactDialogBody,
  CompactDialogContent,
  CompactDialogFooter,
  CompactDialogHeader,
} from "@/components/compact-dialog";
import {
  Dialog,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Inventory } from "@/types/inventory";
import { Loader2, Warehouse } from "lucide-react";
import { useEffect } from "react";
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

  useEffect(() => {
    if (!open) return;

    reset({
      name: editingInventory?.name ?? "",
      address: editingInventory?.address ?? "",
    });
  }, [open, editingInventory, reset]);

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
      <CompactDialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <CompactDialogHeader>
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
          </CompactDialogHeader>

          <CompactDialogBody>
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
          </CompactDialogBody>

          <CompactDialogFooter>
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
          </CompactDialogFooter>
        </form>
      </CompactDialogContent>
    </Dialog>
  );
}
