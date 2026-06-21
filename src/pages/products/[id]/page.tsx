import { PageHeader } from "@/components/page-header";
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
import { formatCurrency } from "@/lib/data";
import { ProductDialog } from "@/pages/products/components/product-dialog";
import {
  deleteProduct,
  getCategories,
  getProductById,
  updateProduct,
} from "@/queries/products";
import type { Product, ProductFormSubmitValues } from "@/types/product";
import {
  ArrowLeft,
  Boxes,
  Loader2,
  Package,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (!id) {
      setError("Product not found");
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const data = await getProductById(id);
        if (cancelled) return;
        if (!data) {
          setError("Product not found");
          return;
        }
        setProduct(data);
        setActiveImage(0);
      } catch (err) {
        if (!cancelled) {
          setError((err as Error).message ?? "Failed to load product");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [id]);

  // Categories only load once the edit dialog is actually opened, and only once.
  useEffect(() => {
    if (!dialogOpen || categories.length > 0) return;
    getCategories().then((res) => {
      const cats: { data: { id: string; name: string }[] } = res.data;
      setCategories(cats.data ?? []);
    });
  }, [dialogOpen, categories.length]);

  async function handleSubmit(values: ProductFormSubmitValues) {
    if (!product) return;
    await updateProduct(product.id, values);
    const refreshed = await getProductById(product.id);
    if (refreshed) {
      setProduct(refreshed);
      setActiveImage(0);
    }
    toast.success("Product updated", {
      description: `"${values.name ?? product.name}" has been updated.`,
    });
  }

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    try {
      await deleteProduct(product.id);
      toast.success("Product deleted", {
        description: `"${product.name}" has been removed.`,
      });
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

  if (error || !product) {
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
          {error ?? "Product not found."}
        </div>
      </div>
    );
  }

  const images = product.images ?? [];
  const inventories = product.inventories ?? [];
  const totalStock =
    product.totalStock ?? inventories.reduce((s, i) => s + i.quantity, 0);
  const isOutOfStock = totalStock <= 0;

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
            onClick={handleDelete}
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
                        className={`size-14 shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                          i === activeImage
                            ? "border-primary"
                            : "border-transparent hover:border-muted-foreground/30"
                        }`}
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

        {/* Summary */}
        <Card className="lg:col-span-3">
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
                  variant={isOutOfStock ? "destructive" : "secondary"}
                  className="mt-1.5"
                >
                  {totalStock < 10 && totalStock > 1
                    ? "Low Stock"
                    : totalStock > 10
                      ? "In Stock"
                      : "Out of Stock"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock by location */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-muted-foreground" />
            Stock by Location
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
                  <TableHead className="py-3 pl-6">Location</TableHead>
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
                        className={
                          inv.quantity === 0
                            ? "font-medium text-red-500"
                            : inv.quantity < 10
                              ? "font-medium text-orange-500"
                              : "font-medium text-green-500"
                        }
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

      <ProductDialog
        open={dialogOpen}
        categories={categories}
        editingProduct={product}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
