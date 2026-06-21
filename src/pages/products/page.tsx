"use client";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/data";
import { ProductDialog } from "@/pages/products/components/product-dialog";
import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  updateProduct,
} from "@/queries/products";
import type { Product, ProductFormSubmitValues } from "@/types/product";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="size-9 shrink-0 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
            </div>
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-5 w-10 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="flex gap-1">
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
              <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            </div>
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function ProductsPage() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch products + categories
  async function fetchData() {
    setIsLoading(true);
    setError(null);
    try {
      const [productsRes, catsRes] = await Promise.all([
        getProducts({ search: debouncedSearch }),
        getCategories(),
      ]);
      setProducts(productsRes.data);
      const cats: { data: { id: string; name: string }[] } = catsRes.data;
      setCategories(cats.data ?? []);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load products");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [debouncedSearch]);

  // ── CRUD ────────────────────────────────────────────────────────────────
  // handleSubmit — replaces the old version
  async function handleSubmit(values: ProductFormSubmitValues, id?: string) {
    try {
      if (id) {
        await updateProduct(id, values);
        toast.success("Product updated", {
          description: `"${values.name}" has been updated.`,
        });
      } else {
        await createProduct(values);
        toast.success("Product created", {
          description: `"${values.name}" has been added to the catalog.`,
        });
      }
      fetchData();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }
  async function handleDelete(product: Product) {
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      toast.success("Product deleted", {
        description: `"${product.name}" has been removed.`,
      });
    } catch {
      toast.error("Could not delete product", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  function openCreate() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setDialogOpen(true);
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, prices, and stock."
      >
        <div className="flex gap-2">
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              <Search className="size-4" />
            </span>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name "
              className="w-64 pl-9"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Add Product
          </Button>
        </div>
      </PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card className="overflow-hidden border">
        <CardContent className="p-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow className="">
                <TableHead className="py-3 pl-3 w-2/5">Product</TableHead>
                <TableHead className="py-3 w-1/5">Category</TableHead>
                <TableHead className="py-3 w-[14%] ">Price</TableHead>
                <TableHead className="py-3 w-[14%]">Status</TableHead>
                <TableHead className="py-3 w-[12%] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton />
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-12 text-center">
                    <Package className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      {search
                        ? `No products match "${search}"`
                        : "No products yet."}
                    </p>
                    {!search && (
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2"
                        onClick={openCreate}
                      >
                        Add your first product
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const isDeleting = deletingId === p.id;
                  return (
                    <TableRow
                      key={p.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => navigate(`/products/${p.id}`)}
                    >
                      <TableCell className="py-3.5 pl-3 pr-2">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                            {p.primaryImage ? (
                              <img
                                src={p.primaryImage}
                                alt={p.name}
                                className="size-full object-cover"
                              />
                            ) : (
                              <Package className="size-4 text-muted-foreground/50" />
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {p.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3.5">
                        {p.category ? (
                          <Badge variant="secondary">{p.category}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-2 py-3.5 font-mono font-semibold text-primary">
                        {formatCurrency(p.price)}
                      </TableCell>
                      <TableCell className="px-2 py-3.5">
                        <Badge
                          variant={
                            p.inStock === false ? "destructive" : "secondary"
                          }
                        >
                          {p.inStock === false ? "Out of Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell
                        className="px-2 py-3.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => handleDelete(p)}
                            aria-label={`Delete ${p.name}`}
                          >
                            {isDeleting ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        editingProduct={editingProduct}
        categories={categories}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
