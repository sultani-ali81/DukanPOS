"use client";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInventory } from "@/hooks/use-inventory";
import { formatCurrency } from "@/lib/data";
import {
  createInventory,
  deleteInventory,
  updateInventory,
} from "@/queries/inventory";
import type { Inventory } from "@/types/inventory";
import {
  AlertTriangle,
  ChevronLeft,
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

// ── Add / Edit Inventory dialog ───────────────────────────────────────────────

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
      <DialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Edit Inventory" : "Add Inventory"}
            </DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Update details for "${editingInventory.name}".`
                : "Create a new store, warehouse, or branch."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="inv-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-name"
                placeholder="e.g. Main Warehouse"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="inv-address">
                Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="inv-address"
                placeholder="e.g. Shahr-e Naw, Kabul"
                {...register("address", { required: "Address is required" })}
              />
              {errors.address && (
                <p className="text-xs text-destructive">
                  {errors.address.message}
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
              {isEdit ? "Save Changes" : "Create Inventory"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

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

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

// ── Stock status badge ────────────────────────────────────────────────────────

function StockBadge({ quantity }: { quantity: number }) {
  if (quantity === 0) return <Badge variant="destructive">Out of Stock</Badge>;
  if (quantity <= 10) return <Badge variant="secondary">Low Stock</Badge>;
  return <Badge variant="secondary">In Stock</Badge>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventoryPage() {
  const navigate = useNavigate();
  const {
    inventories,
    paginationMeta,
    loading,
    error,
    selectedInventory,
    detailLoading,
    stats,
    filtered,
    selectedInventoryId,
    switchInventory,
    openAddInventoryDialog,
    inventoryDialogOpen,
    inventoryDialogTarget,
    closeInventoryDialog,
    handleInventoryAdded,
    handleInventoryUpdated,
    handleInventoryDeleted,
    listSearch,
    setListSearch,
    clearListSearch,
    status,
    setStatus,
    search,
    setSearch,
  } = useInventory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInventory, setEditingInventory] = useState<Inventory | null>(
    null,
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Stats ──────────────────────────────────────────────────────────────────

  const totalUnits = (selectedInventory?.products ?? []).reduce(
    (sum, p) => sum + p.quantity,
    0,
  );
  const stockValue = (selectedInventory?.products ?? []).reduce(
    (sum, p) => sum + p.quantity * p.price,
    0,
  );
  const lowStock = (selectedInventory?.products ?? []).filter(
    (p) => p.quantity > 0 && p.quantity <= 10,
  ).length;
  const outOfStock = (selectedInventory?.products ?? []).filter(
    (p) => p.quantity === 0,
  ).length;

  // ── Dialog openers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingInventory(null);
    setDialogOpen(true);
  }

  function openEdit(inv: Inventory) {
    setEditingInventory(inv);
    setDialogOpen(true);
  }

  // ── Create / Update ────────────────────────────────────────────────────────

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

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function onDelete(inv: Inventory) {
    setDeletingId(inv.id);
    try {
      await deleteInventory(inv.id);
      if (selectedInventoryId === inv.id) switchInventory(null);
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

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats — always show selected inventory stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Units"
          value={totalUnits.toLocaleString()}
          icon={Warehouse}
          accent="primary"
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(stockValue)}
          icon={Package}
          accent="emerald"
        />
        <StatCard
          label="Low Stock Items"
          value={String(lowStock)}
          icon={AlertTriangle}
          accent="amber"
        />
        <StatCard
          label="Out of Stock"
          value={String(outOfStock)}
          icon={AlertTriangle}
          accent="rose"
        />
      </div>

      <Tabs defaultValue="inventories" className="w-full">
        <TabsList className="mb-4 inline-flex h-9 w-fit">
          <TabsTrigger value="inventories">
            Inventories ({paginationMeta.totalItems})
          </TabsTrigger>

          <TabsTrigger value="detail">Stock Levels</TabsTrigger>

          <TabsTrigger value="movements">Stock Movements</TabsTrigger>
        </TabsList>

        {/* ── Tab: Inventories list ─────────────────────────────────────── */}
        <TabsContent value="inventories" className="mt-4">
          {/* Search */}
          <div className="mb-4 relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <Input
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="Search inventories..."
              className="pl-9 pr-8"
            />
            {listSearch && (
              <button
                onClick={clearListSearch}
                className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <InventoryCardSkeleton key={i} />
              ))}
            </div>
          ) : inventories.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
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
                const isSelected = selectedInventoryId === inv.id;
                const totalQty = (inv.items ?? []).reduce(
                  (s: number, p: { quantity?: number }) =>
                    s + (p.quantity ?? 0),
                  0,
                );
                return (
                  <Card
                    key={inv.id}
                    className={`cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                      isSelected ? "border-primary ring-1 ring-primary/30" : ""
                    }`}
                    onClick={() => switchInventory(inv.id)}
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
                            aria-label={`Edit ${inv.name}`}
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
                            aria-label={`Delete ${inv.name}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">
                          {(inv.items ?? []).length} products
                        </span>
                        <span className="font-semibold text-foreground">
                          {totalQty} units
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {paginationMeta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {paginationMeta.currentPage} of {paginationMeta.totalPages}{" "}
                · {paginationMeta.totalItems} total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={paginationMeta.currentPage <= 1}
                  onClick={() =>
                    navigate(
                      `?page=${paginationMeta.currentPage - 1}${listSearch ? `&search=${listSearch}` : ""}`,
                    )
                  }
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    paginationMeta.currentPage >= paginationMeta.totalPages
                  }
                  onClick={() =>
                    navigate(
                      `?page=${paginationMeta.currentPage + 1}${listSearch ? `&search=${listSearch}` : ""}`,
                    )
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Stock Levels (selected inventory detail) ─────────────── */}
        <TabsContent value="detail" className="mt-4">
          {!selectedInventoryId ? (
            <div className="rounded-lg border border-dashed border-border py-12 text-center">
              <Package className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Select an inventory above to view stock levels.
              </p>
            </div>
          ) : detailLoading ? (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableSkeleton rows={8} />
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Back + header */}
              <div className="mb-3 flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchInventory(null)}
                  className="gap-1"
                >
                  <ChevronLeft className="size-4" /> Back to list
                </Button>
                <div className="flex items-center gap-3">
                  <span className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Search className="size-4" />
                    </span>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search products..."
                      className="w-64 pl-9"
                    />
                  </span>
                  {/* Status filter */}
                  <div className="flex gap-1">
                    {["all", "In Stock", "Low Stock", "Out of Stock"].map(
                      (s) => (
                        <button
                          key={s}
                          onClick={() => setStatus(s)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                            status === s
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-accent"
                          }`}
                        >
                          {s === "all" ? "All" : s}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>

              <Card>
                <CardContent className="overflow-x-auto p-0">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={5}
                            className="py-10 text-center text-sm text-muted-foreground"
                          >
                            No products found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filtered.map((p) => (
                          <TableRow key={p.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {p.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {((p as unknown as Record<string, unknown>)
                                .category as string) ?? "—"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatCurrency(p.price)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {p.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              <StockBadge quantity={p.quantity} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Tab: Stock Movements ───────────────────────────────────────── */}
        <TabsContent value="movements" className="mt-4">
          <Card>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Inventory</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Stock movements are recorded automatically from purchases
                      and sales.
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <p className="mt-3 text-xs text-muted-foreground">
            Stock-In is created from purchases and stays pending until received.
            Stock-Out is recorded automatically when a sale is completed in the
            POS.
          </p>
        </TabsContent>
      </Tabs>

      {/* Add / Edit dialog */}
      <InventoryDialog
        open={dialogOpen}
        editingInventory={editingInventory}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
    </div>
  );
}
