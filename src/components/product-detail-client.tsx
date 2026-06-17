"use client";

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
import {
  type Product,
  formatCurrency,
  getCategoryName,
  getProductInventoryStock,
  getProductRecentSales,
  getProductTotalStock,
} from "@/lib/data";
import {
  ArrowLeft,
  Barcode,
  Pencil,
  ShoppingCart,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function ProductDetailClient({ product }: { product: Product }) {
  const navigate = useNavigate();
  const hasVariants = product.variants && product.variants.length > 0;
  const totalStock = getProductTotalStock(product);
  const inventoryStock = getProductInventoryStock(product);
  const recentSales = getProductRecentSales(product);
  const margin = product.sellingPrice - product.purchasePrice;
  const marginPct =
    product.purchasePrice > 0
      ? Math.round((margin / product.purchasePrice) * 100)
      : 0;

  return (
    <div>
      <PageHeader
        title={product.name}
        description={`Product details, stock by inventory, and recent sales.`}
      >
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            render={<Link ref="/products" />}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>
          <Button
            type="button"
            onClick={() =>
              toast.info("Edit product", {
                description: "Editing is not wired up in this demo.",
              })
            }
          >
            <Pencil className="size-4" /> Edit Product
          </Button>
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Total Stock</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {totalStock}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Purchase Price</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {formatCurrency(product.purchasePrice)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Selling Price</p>
                <p className="mt-1 text-xl font-bold text-primary">
                  {formatCurrency(product.sellingPrice)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Margin</p>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {marginPct}%
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Product details table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Category
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">
                        {getCategoryName(product.categoryId)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Barcode
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="flex items-center justify-end gap-1.5 text-sm text-foreground">
                        <Barcode className="size-3.5" />
                        {product.barcode}
                      </span>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Low Stock Alert
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {product.lowStockThreshold} units
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Profit per Unit
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(margin)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-muted-foreground">
                      Variants
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {hasVariants ? `${product.variants!.length}` : "None"}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Variants table */}
          {hasVariants && (
            <Card>
              <CardHeader>
                <CardTitle>Variants</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Variant</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Purchase</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {product.variants!.map((v) => (
                        <TableRow key={v.id}>
                          <TableCell className="font-medium">
                            {v.name}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {v.sku}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(v.purchasePrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(v.sellingPrice)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={
                                v.stock <= 5 ? "destructive" : "secondary"
                              }
                            >
                              {v.stock}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stock by inventory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="size-4" /> Available Stock by Inventory
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Inventory</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">
                        Available Stock
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryStock.map((row) => (
                      <TableRow key={row.inventoryId}>
                        <TableCell className="font-medium text-foreground">
                          {row.inventoryName}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {row.location}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={
                              row.stock <= product.lowStockThreshold
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {row.stock}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: recent sales */}
        <div className="space-y-6">
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <TrendingUp className="size-3.5" /> Units sold (recent)
                </span>
                <span className="font-medium text-foreground">
                  {recentSales.reduce((s, r) => s + r.quantity, 0)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-base font-bold text-foreground">
                  Recent Revenue
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(recentSales.reduce((s, r) => s + r.total, 0))}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="size-4" /> Recent Sales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-foreground">
                      {sale.invoiceNo}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sale.customer}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sale.date}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-foreground">
                      {formatCurrency(sale.total)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {sale.quantity} units
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
