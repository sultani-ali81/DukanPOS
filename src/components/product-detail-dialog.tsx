"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { type Product, formatCurrency, getCategoryName } from "@/lib/data";
import { Barcode } from "lucide-react";

interface ProductDetailDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailDialog({
  product,
  open,
  onOpenChange,
}: ProductDetailDialogProps) {
  const hasVariants = product?.variants && product.variants.length > 0;
  const totalStock = hasVariants
    ? product.variants!.reduce((s, v) => s + v.stock, 0)
    : (product?.stock ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
          <DialogDescription>
            {product && (
              <span className="flex items-center gap-2">
                <Badge variant="secondary">
                  {getCategoryName(product.categoryId)}
                </Badge>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Barcode className="size-3.5" />
                  {product.barcode}
                </span>
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {product && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Total Stock</p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {totalStock}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    Purchase Price
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {formatCurrency(product.purchasePrice)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">Selling Price</p>
                  <p className="mt-1 text-lg font-bold text-primary">
                    {formatCurrency(product.sellingPrice)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">
                    Low Stock Alert
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    {product.lowStockThreshold}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Variants */}
            {hasVariants ? (
              <div>
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Variants
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Variant</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead className="text-right">Purchase</TableHead>
                      <TableHead className="text-right">Selling</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants!.map((v) => (
                      <TableRow key={v.id}>
                        <TableCell className="font-medium">{v.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {v.sku}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {v.barcode ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(v.purchasePrice)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(v.sellingPrice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={v.stock <= 5 ? "destructive" : "secondary"}
                          >
                            {v.stock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                No variants — this product has a single SKU.
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button>Edit Product</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
