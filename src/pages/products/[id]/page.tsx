import LogsTable from "@/components/logs-table";
import { PageHeader } from "@/components/page-header";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createAuditLogsMatcher } from "@/lib/audit-logs-cache";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { formatCurrency } from "@/lib/currency";
import { extractError } from "@/lib/error";
import { getStockStatus } from "@/lib/stock-status";
import { cn } from "@/lib/utils";
import { ProductDialog } from "@/pages/products/components/product-dialog";
import { getCategories } from "@/queries/category";
import {
  deleteProduct,
  getProductById,
  updateProduct,
} from "@/queries/products";
import type { ProductFormSubmitValues } from "@/types/product";
import {
  ArrowLeft,
  Boxes,
  Loader2,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

const PRODUCT_CATEGORIES_KEY = [
  "categories",
  { page: 1, itemsPerPage: 12, search: "" },
] as const;

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutate: mutateCache } = useSWRConfig();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  const {
    data: product,
    isLoading,
    error: productError,
  } = useSWR(
    id ? (["product-detail", id] as const) : null,
    ([, productId]) => getProductById(productId),
  );
  const { data: categoriesData } = useSWR(
    dialogOpen ? PRODUCT_CATEGORIES_KEY : null,
    ([, params]) => getCategories(params),
  );
  const categories = categoriesData?.data ?? [];
  const errorMessage = !id
    ? "Product not found."
    : productError
      ? extractError(productError, "Failed to load product")
      : null;

  async function handleSubmit(values: ProductFormSubmitValues) {
    if (!product) return;
    await updateProduct(product.id, values);
    await mutateCache(createCrudFamilyMatcher("products", product.id));
    setActiveImage(0);
    await mutateCache(createAuditLogsMatcher(product.id), undefined, {
      revalidate: true,
    });
    toast.success("Product updated", {
      description: `"${values.name ?? product.name}" has been updated.`,
    });
  }

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      await mutateCache(createCrudFamilyMatcher("products", product.id));
      toast.success("Product deleted", {
        description: `"${product.name}" has been removed.`,
      });
      setDeleteDialogOpen(false);
      navigate("/products");
    } catch {
      toast.error("Could not delete product", {
        description: "Please try again.",
      });
    } finally {
      setDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (errorMessage || !product) {
    return (
      <div>
        <PageHeader title="Product" description="Product not found.">
          <Button asChild variant="outline">
            <Link to="/products">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
        </PageHeader>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage ?? "Product not found."}
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const inventories = product.inventories ?? [];
  const totalStock =
    product.totalStock ?? inventories.reduce((s, i) => s + i.quantity, 0);
  const stockStatus = getStockStatus(totalStock);

  return (
    <div>
      <PageHeader
        title={product.name}
        description="Product details and stock information."
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link to="/products">
              <ArrowLeft className="size-4" /> Back
            </Link>
          </Button>
          <Button onClick={() => setDialogOpen(true)}>
            <Pencil className="size-4" /> Edit Product
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
            Delete
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Images */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            {images.length > 0 ? (
              <div className="space-y-3">
                <div className="aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={
                      images[activeImage]?.imageUrlSigned ??
                      images[activeImage]?.imageUrl
                    }
                    alt={product.name}
                    className="size-full object-cover"
                  />
                </div>
                {images.length > 1 && (
                  <div className="flex gap-2">
                    {images.map((img, i) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => setActiveImage(i)}
                        className={cn(
                          "size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors",
                          i === activeImage
                            ? "border-primary"
                            : "border-transparent hover:border-muted-foreground/30",
                        )}
                      >
                        <img
                          src={img.imageUrlSigned ?? img.imageUrl}
                          alt=""
                          className="size-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground">
                <Package className="size-8 text-muted-foreground/40" />
                <p className="text-sm">No images uploaded.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="gap-6 lg:col-span-3 lg:flex-col">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <Badge variant="secondary" className="mt-1.5">
                    {product.category ?? "—"}
                  </Badge>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Selling Price</p>
                  <p className="mt-1 font-semibold text-primary">
                    {formatCurrency(product.price)}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total Stock</p>
                  <p className="mt-1 font-semibold">{totalStock} units</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      stockStatus === "Out of Stock"
                        ? "destructive"
                        : "secondary"
                    }
                    className="mt-1.5"
                  >
                    {stockStatus}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock by location */}
          <Card className="lg:col-span-2 mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Boxes className="size-4 text-muted-foreground" />
                Stock by Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {inventories.length === 0 ? (
                <p className="px-6 pb-6 text-sm text-muted-foreground">
                  This product isn't stocked in any inventory yet.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="py-3 pl-6">Inventory</TableHead>
                      <TableHead className="py-3 pr-6 text-right">
                        Quantity
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventories.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="py-3 pl-6">{inv.name}</TableCell>
                        <TableCell className="py-3 pr-6 text-right tabular-nums">
                          <span
                            className={cn(
                              "font-medium",
                              getStockStatus(inv.quantity) === "Out of Stock"
                                ? "text-red-500"
                                : getStockStatus(inv.quantity) === "Low Stock"
                                  ? "text-orange-500"
                                  : "text-green-500",
                            )}
                          >
                            {inv.quantity}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="border-t-2 font-semibold">
                      <TableCell className="py-3 pl-6">Total</TableCell>
                      <TableCell className="py-3 pr-6 text-right tabular-nums">
                        {totalStock}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Audit history */}
      <Card className="lg:col-span-3 mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>Logs History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LogsTable entityId={product.id} />
        </CardContent>
      </Card>

      <ProductDialog
        open={dialogOpen}
        categories={categories}
        editingProduct={product}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!deleting) setDeleteDialogOpen(open);
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogTitle>Delete product?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{product.name}"? This action
            cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-2 pt-1">
            <AlertDialogCancel className="flex-1" disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              className="flex-1"
              disabled={deleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
