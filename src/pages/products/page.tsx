import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useProducts } from "@/hooks/use-products";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { formatCurrency } from "@/lib/currency";
import { extractError } from "@/lib/error";
import { ProductDialog } from "@/pages/products/components/product-dialog";
import { getCategories } from "@/queries/category";
import {
  createProduct,
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/queries/products";
import type {
  CreateProductPayload,
  Product,
  ProductFormSubmitValues,
} from "@/types/product";
import {
  Loader2,
  Package,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const PRODUCT_CATEGORIES_KEY = [
  "categories",
  { page: 1, itemsPerPage: 12, search: "" },
] as const;

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
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
  const { mutate: mutateCache } = useSWRConfig();

  const {
    products,
    totalPages,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    isLoading,
    error,
    PAGE_SIZE,
  } = useProducts();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingLoadingId, setEditingLoadingId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const failedSignedUrlsRef = useRef(new Set<string>());

  const { data: categoriesData } = useSWR(
    PRODUCT_CATEGORIES_KEY,
    ([, params]) => getCategories(params),
  );
  const categories = categoriesData?.data ?? [];

  // ── CRUD ────────────────────────────────────────────────────────────────

  async function handleSubmit(values: ProductFormSubmitValues, id?: string) {
    if (id) {
      await updateProduct(id, values);
      return;
    }

    // Create always sends the complete required product fields.
    return createProduct(values as CreateProductPayload);
  }

  async function handleDelete(product: Product) {
    setDeletingId(product.id);
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted", {
        description: `"${product.name}" has been removed.`,
      });
      setProductToDelete(null);
      await mutateCache(
        createCrudFamilyMatcher("products", product.id),
      );
    } catch {
      toast.error("Could not delete product", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  async function refreshExpiredProductImage(productId: string, url: string) {
    if (failedSignedUrlsRef.current.has(url)) return;
    failedSignedUrlsRef.current.add(url);
    try {
      await mutateCache(createCrudFamilyMatcher("products", productId));
    } catch {
      // Keep the failed image hidden; a later page revalidation can retry it.
    }
  }

  function openCreate() {
    setEditingProduct(null);
    setDialogOpen(true);
  }

  async function openEdit(product: Product) {
    setEditingLoadingId(product.id);
    try {
      const authoritativeProduct = await getProductById(product.id);
      if (!authoritativeProduct) throw new Error("Product not found");
      setEditingProduct(authoritativeProduct);
      setDialogOpen(true);
    } catch (error: unknown) {
      toast.error("Could not open product", {
        description: extractError(error, "Please try again."),
      });
    } finally {
      setEditingLoadingId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog, prices, and stock."
      >
        <div className="flex gap-2">
          <SearchField
            value={search}
            onValueChange={handleSearch}
            onClear={clearSearch}
            placeholder="Search by name or barcode..."
            aria-label="Search products by name or barcode"
            inputClassName="w-64"
          />
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
          <Table className="table-fixed min-w-[630px]">
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="py-3 pl-3 w-2/5">Product</TableHead>
                <TableHead className="py-3 w-1/5">Category</TableHead>
                <TableHead className="py-3 w-[14%] text-right">Price</TableHead>
                <TableHead className="py-3 w-[12%] text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton rows={PAGE_SIZE} />
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
                  const isOpeningEditor = editingLoadingId === p.id;
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
                                onError={() =>
                                  void refreshExpiredProductImage(
                                    p.id,
                                    p.primaryImage ?? "",
                                  )
                                }
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
                      <TableCell className="px-2 py-3.5 text-right font-mono font-semibold text-primary">
                        {formatCurrency(p.price)}
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
                            disabled={isOpeningEditor}
                            onClick={() => void openEdit(p)}
                            aria-label={`Edit ${p.name}`}
                          >
                            {isOpeningEditor ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Pencil className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            disabled={isDeleting}
                            onClick={() => setProductToDelete(p)}
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

      <PaginationFooter
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      <ProductDialog
        open={dialogOpen}
        editingProduct={editingProduct}
        categories={categories}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={productToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deletingId) setProductToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            {productToDelete
              ? `Are you sure you want to delete "${productToDelete.name}"? This action cannot be undone.`
              : "This action cannot be undone."}
          </AlertDialogDescription>
          <div className="flex gap-2 pt-1">
            <AlertDialogCancel className="flex-1" disabled={!!deletingId}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1"
              disabled={!!deletingId}
              onClick={(event) => {
                event.preventDefault();
                if (productToDelete) void handleDelete(productToDelete);
              }}
            >
              {deletingId ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {deletingId ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
