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
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

// ── Category dialog ───────────────────────────────────────────────────────────

export interface CategoryFormValues {
  name: string;
}

interface CategoryDialogProps {
  open: boolean;
  editingCategory: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    values: CategoryFormValues,
    id?: string,
  ) => Promise<{ id: string; name: string } | void>;
  /** Called after a successful create (not edit) with the new category. */
  onCreated?: (category: { id: string; name: string }) => void;
}

export function CategoryDialog({
  open,
  editingCategory,
  onOpenChange,
  onSubmit,
  onCreated,
}: CategoryDialogProps) {
  const isEdit = !!editingCategory;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    defaultValues: { name: editingCategory?.name ?? "" },
  });

  // Re-sync form values whenever the dialog opens or the target category changes.
  // `defaultValues` only applies on first mount, so without this the form would
  // keep showing stale data from whichever category was edited previously.
  useEffect(() => {
    if (open) {
      reset({ name: editingCategory?.name ?? "" });
    }
  }, [open, editingCategory, reset]);

  async function submit(values: CategoryFormValues) {
    const result = await onSubmit(values, editingCategory?.id);
    if (!isEdit && result) {
      onCreated?.(result);
    }
    onOpenChange(false);
    reset({ name: "" });
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
            <DialogTitle>
              {isEdit ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCategory
                ? `Update name for "${editingCategory.name}".`
                : "Create a new category to organize your products."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-name">
                Category Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cat-name"
                placeholder="e.g. Dairy, Beverages"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
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
              {isEdit ? "Save Changes" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
