import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { useInventory } from "@/hooks/use-inventory";
import {
  createInventory,
  deleteInventory,
  updateInventory,
} from "@/queries/inventory";
import type { Inventory } from "@/types/inventory";
import { Plus, Search, Warehouse, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  InventoryCard,
  InventoryCardSkeleton,
} from "./components/inventory-card";
import type { InventoryFormValues } from "./components/inventory-dialog";
import { InventoryDialog } from "./components/inventory-dialog";

export default function InventoryPage() {
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
        handleInventoryAdded();
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
          {inventories.map((inv) => (
            <InventoryCard
              key={inv.id}
              inventory={inv}
              isDeleting={deletingId === inv.id}
              onEdit={openEdit}
              onDelete={onDelete}
            />
          ))}
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
