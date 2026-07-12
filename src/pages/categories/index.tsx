"use client";

import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
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
import { useCategories } from "@/hooks/use-categories";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deterministic color from category name — no backend color field needed */
function categoryColor(name: string): { bg: string; text: string } {
  const palette = [
    { bg: "bg-blue-100", text: "text-blue-600" },
    { bg: "bg-emerald-100", text: "text-emerald-600" },
    { bg: "bg-amber-100", text: "text-amber-600" },
    { bg: "bg-rose-100", text: "text-rose-600" },
    { bg: "bg-purple-100", text: "text-purple-600" },
    { bg: "bg-cyan-100", text: "text-cyan-600" },
    { bg: "bg-pink-100", text: "text-pink-600" },
    { bg: "bg-indigo-100", text: "text-indigo-600" },
  ];
  const idx =
    name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) %
    palette.length;
  return palette[idx];
}

// ── Category dialog ───────────────────────────────────────────────────────────

interface CategoryFormValues {
  name: string;
}

interface CategoryDialogProps {
  open: boolean;
  editingCategory: { id: string; name: string } | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CategoryFormValues, id?: string) => Promise<void>;
}

function CategoryDialog({
  open,
  editingCategory,
  onOpenChange,
  onSubmit,
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

  async function submit(values: CategoryFormValues) {
    await onSubmit(values, editingCategory?.id);
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
              {isEdit
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

// ── Skeleton card ───────────────────────────────────────────────────────────

function CategoryCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="size-12 animate-pulse rounded-xl bg-muted" />
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const {
    categories,
    meta,
    loading,
    error,
    search,
    handleSearch,
    clearSearch,
    mutate,
    page,
    goToPage,
    totalPages,
    totalItems,
  } = useCategories();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async function handleSubmit(values: CategoryFormValues, id?: string) {
    try {
      const { createCategory, updateCategory } =
        await import("@/queries/category");
      if (id) {
        await updateCategory(id, values);
        toast.success("Category updated", {
          description: `"${values.name}" has been updated.`,
        });
      } else {
        await createCategory(values);
        toast.success("Category created", {
          description: `"${values.name}" is ready to use.`,
        });
      }
      mutate();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }

  async function handleDelete(cat: { id: string; name: string }) {
    setDeletingId(cat.id);
    try {
      const { deleteCategory } = await import("@/queries/category");
      await deleteCategory(cat.id);
      mutate();
      toast.success("Category deleted", {
        description: `"${cat.name}" has been removed.`,
      });
    } catch {
      toast.error("Could not delete category", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Dialog openers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCategory(null);
    setDialogOpen(true);
  }

  function openEdit(cat: { id: string; name: string }) {
    setEditingCategory(cat);
    setDialogOpen(true);
  }

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader
        title="Categories"
        description="Organize your products into categories."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Category
        </Button>
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="mb-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="mb-4 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="size-4" />
        </span>
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search categories..."
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CategoryCardSkeleton key={i} />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Package className="mx-auto mb-3 size-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {search ? `No categories match "${search}"` : "No categories yet."}
          </p>
          {!search && (
            <Button
              variant="link"
              size="sm"
              className="mt-2"
              onClick={openCreate}
            >
              Add your first category
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {categories.map((cat) => {
            const isDeleting = deletingId === cat.id;
            const colors = categoryColor(cat.name);
            return (
              <Card key={cat.id}>
                <CardContent className="flex items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${colors.bg}`}
                    >
                      <Package className={`size-6 ${colors.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">
                        {cat.name}
                      </p>
                      <p className="text-sm text-muted-foreground"></p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => openEdit(cat)}
                      aria-label={`Edit ${cat.name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-destructive hover:text-destructive"
                      disabled={isDeleting}
                      onClick={() => handleDelete(cat)}
                      aria-label={`Delete ${cat.name}`}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (
        <PaginationFooter
          className="mt-auto pt-6"
          currentPage={page}
          totalPages={totalPages}
          onPageChange={goToPage}
          summary={
            <>
            Showing {(page - 1) * meta.itemsPerPage + 1}–
            {Math.min(page * meta.itemsPerPage, totalItems)} of {totalItems} categories
            </>
          }
        />
      )}

      {/* Add / Edit dialog */}
      <CategoryDialog
        open={dialogOpen}
        editingCategory={editingCategory}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
