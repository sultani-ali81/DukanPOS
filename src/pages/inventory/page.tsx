import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInventory } from "@/hooks/use-inventory";
import {
  createInventory,
  deleteInventory,
  updateInventory,
} from "@/queries/inventory";
import type { Inventory } from "@/types/inventory";
import {
  ArrowLeftRight,
  Loader2,
  Plus,
  Search,
  TriangleAlert,
  Warehouse,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  InventoryCard,
  InventoryCardSkeleton,
} from "./components/inventory-card";
import type { InventoryFormValues } from "./components/inventory-dialog";
import { InventoryDialog } from "./components/inventory-dialog";

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
  const [pendingDelete, setPendingDelete] = useState<Inventory | null>(null);

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

  function requestDelete(inv: Inventory) {
    setPendingDelete(inv);
  }

  async function confirmDelete() {
    const inv = pendingDelete;
    if (!inv) return;

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
      setPendingDelete(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Manage warehouses, stock levels, and stock movements."
      >
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/stock-movement/new")}
          >
            <ArrowLeftRight className="size-4" /> Transfer Stock
          </Button>
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Inventory
          </Button>
        </div>
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
              onDelete={requestDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      <PaginationFooter
        currentPage={page}
        totalPages={paginationMeta.totalPages}
        onPageChange={goToPage}
        summary={
          <>
            Page {paginationMeta.currentPage} of {paginationMeta.totalPages} ·{" "}
            {paginationMeta.totalItems} total
          </>
        }
      />

      <InventoryDialog
        open={dialogOpen}
        editingInventory={editingInventory}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <TriangleAlert className="size-6" />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove{" "}
              <span className="font-medium text-foreground">
                &ldquo;{pendingDelete?.name}&rdquo;
              </span>
              . Any stock associations with products will also be removed. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingId !== null}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deletingId !== null}
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
            >
              {deletingId !== null && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
