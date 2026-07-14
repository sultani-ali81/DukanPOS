"use client";

import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCategories } from "@/hooks/use-categories";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { cn } from "@/lib/utils";
import {
  CategoryDialog,
  type CategoryFormValues,
} from "@/pages/categories/components/category-dialog";
import { Loader2, Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

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
  const { mutate: mutateCache } = useSWRConfig();
  const {
    categories,
    meta,
    loading,
    error,
    search,
    handleSearch,
    clearSearch,
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
      await mutateCache(createCrudFamilyMatcher("categories"));
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
      await mutateCache(createCrudFamilyMatcher("categories"));
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
      <SearchField
        value={search}
        onValueChange={handleSearch}
        onClear={clearSearch}
        placeholder="Search categories..."
        aria-label="Search categories"
        className="mb-4"
      />

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
                      className={cn(
                        "flex size-12 shrink-0 items-center justify-center rounded-xl",
                        colors.bg,
                      )}
                    >
                      <Package className={cn("size-6", colors.text)} />
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
