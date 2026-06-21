import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data";
import { ProductDialog } from "@/pages/products/components/product-dialog";
import {
  deleteProduct,
  getCategories,
  getProductById,
  updateProduct,
} from "@/queries/products";
import type { Product, ProductFormSubmitValues } from "@/types/product";
import { ArrowLeft, Loader2, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
        const [data, catsRes] = await Promise.all([
          getProductById(id),
          getCategories(),
        ]);
        if (cancelled) return;
        if (!data) {
          setError("Product not found");
          return;
        }
        setProduct(data);
        const cats: { data: { id: string; name: string }[] } = catsRes.data;
        setCategories(cats.data ?? []);
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

  async function handleSubmit(values: ProductFormSubmitValues) {
    if (!product) return;
    await updateProduct(product.id, values);
    const refreshed = await getProductById(product.id);
    if (refreshed) setProduct(refreshed);
    toast.success("Product updated", {
      description: `"${values.name}" has been updated.`,
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Summary cards */}
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Category</span>
              <Badge variant="secondary">{product.category ?? "—"}</Badge>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Selling Price</span>
              <span className="font-semibold text-primary">
                {formatCurrency(product.price)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <Badge
                variant={
                  product.inStock === false ? "destructive" : "secondary"
                }
              >
                {product.inStock === false ? "Out of Stock" : "In Stock"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
          </CardHeader>
          <CardContent>
            {product.images && product.images.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {product.images.map((img) => (
                  <img
                    key={img.id}
                    src={
                      img.imageUrlSigned ?? img.imageUrl ?? "/placeholder.png"
                    }
                    alt={product.name}
                    className="aspect-square w-full rounded-lg object-cover border"
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No images uploaded.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <ProductDialog
        open={dialogOpen}
        editingProduct={product}
        categories={categories}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
