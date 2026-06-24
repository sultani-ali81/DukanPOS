// src/pages/inventory/page.tsx
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pagination } from "@/components/ui/pagination";
import { useInventory } from "@/hooks/use-inventory";
import {
  createInventory,
  deleteInventory,
  updateInventory,
} from "@/queries/inventory";
import type { Inventory } from "@/types/inventory";
import {
  ArrowRight,
  Loader2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  Warehouse,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface InventoryFormValues {
  name: string;
  address: string;
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

interface InventoryDialogProps {
  open: boolean;
  editingInventory: Inventory | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: InventoryFormValues, id?: string) => Promise<void>;
}

function InventoryDialog({
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

// ── Card skeleton ─────────────────────────────────────────────────────────────

function InventoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="size-11 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="mt-3 h-8 w-full animate-pulse rounded-lg bg-muted" />
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const navigate = useNavigate();

  const {
    inventories,
    paginationMeta,
    loading,
    error,
    handleInventoryAdded,
    handleInventoryUpdated,
    handleInventoryDeleted,
    listSearch,
    setListSearch,
    clearListSearch,
    page,
    goToPage,
  } = useInventory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditingInventory(null);
    setDialogOpen(true);
  }

  function openEdit(inv: Inventory) {
    setEditingInventory(inv);
    setDialogOpen(true);
  }

  async function onSubmit(values: InventoryFormValues, id?: string) {
    try {
      if (id) {
        await updateInventory(id, values);
        toast.success("Inventory updated", {
          description: `"${values.name}" has been updated.`,
        });
        handleInventoryUpdated(id);
      } else {
        await createInventory(values);
        toast.success("Inventory created", {
          description: `"${values.name}" is ready.`,
        });
        handleInventoryAdded(id as string);
      }
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }

  async function onDelete(inv: Inventory) {
    setDeletingId(inv.id);
    try {
      await deleteInventory(inv.id);
      handleInventoryDeleted();
      toast.success("Inventory deleted", {
        description: `"${inv.name}" has been removed.`,
      });
    } catch {
      toast.error("Could not delete inventory", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage warehouses, stock levels, and stock movements."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Inventory
        </Button>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={listSearch}
          onChange={(e) => setListSearch(e.target.value)}
          placeholder="Search inventories…"
          className="pl-9 pr-8"
        />
        {listSearch && (
          <button
            onClick={clearListSearch}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <InventoryCardSkeleton key={i} />
          ))}
        </div>
      ) : inventories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <Warehouse className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {listSearch
              ? `No inventories match "${listSearch}"`
              : "No inventories yet."}
          </p>
          {!listSearch && (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={openCreate}
            >
              Add your first inventory
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {inventories.map((inv) => {
            const isDeleting = deletingId === inv.id;
            return (
              <Card
                key={inv.id}
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md group"
                onClick={() => navigate(`/inventory/${inv.id}`)}
              >
                <CardContent className="p-5">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Warehouse className="size-6" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-foreground">
                          {inv.name}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{inv.address}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(inv);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={isDeleting}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(inv);
                        }}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm mb-2">
                    <span className="text-muted-foreground">
                      {(inv.items ?? []).length} products
                    </span>
                  </div>

                  {/* View link */}
                  <div className="mt-3 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Package className="size-3.5" />
                    View stock levels
                    <ArrowRight className="size-3.5" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {paginationMeta.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {paginationMeta.currentPage} of {paginationMeta.totalPages} ·{" "}
            {paginationMeta.totalItems} total
          </span>
          <Pagination
            currentPage={page}
            totalPages={paginationMeta.totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}

      <InventoryDialog
        open={dialogOpen}
        editingInventory={editingInventory}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
    </div>
  );
}
