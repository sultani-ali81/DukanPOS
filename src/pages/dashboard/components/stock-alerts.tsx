import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  PaginatedStockProducts,
  StockProduct,
} from "@/types/dashboard";
import { AlertTriangle, ChevronLeft, ChevronRight, Package } from "lucide-react";

interface StockAlertsProps {
  outOfStock?: PaginatedStockProducts;
  lowStock?: PaginatedStockProducts;
  onOutOfStockPageChange: (page: number) => void;
  onOutOfStockPageSizeChange: (pageSize: number) => void;
  onLowStockPageChange: (page: number) => void;
  onLowStockPageSizeChange: (pageSize: number) => void;
}

type StockSectionTone = "danger" | "warning";

interface StockSectionProps {
  title: string;
  emptyMessage: string;
  products: PaginatedStockProducts;
  tone: StockSectionTone;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function ProductRow({
  product,
  tone,
}: {
  product: StockProduct;
  tone: StockSectionTone;
}) {
  const isOutOfStock = tone === "danger";

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border p-3",
        isOutOfStock
          ? "border-red-100 bg-red-50/50"
          : "border-amber-100 bg-amber-50/50",
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-gray-900">
          {product.name}
        </p>
        <p className="truncate text-xs text-gray-500">
          {product.inventoryName}
        </p>
      </div>
      <Badge
        className={cn(
          "shrink-0",
          isOutOfStock
            ? "border-red-200 bg-red-100 text-red-600 hover:bg-red-100"
            : "border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-100",
        )}
      >
        {isOutOfStock ? "Out of stock" : `${product.quantity} left`}
      </Badge>
    </div>
  );
}

function StockSection({
  title,
  emptyMessage,
  products,
  tone,
  onPageChange,
  onPageSizeChange,
}: StockSectionProps) {
  const pageSizeOptions = Array.from(
    new Set([...PAGE_SIZE_OPTIONS, products.pageSize]),
  ).sort((a, b) => a - b);
  const hasMultiplePages = products.totalPages > 1;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="border-b border-border">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle
              className={cn(
                "size-4",
                tone === "danger" ? "text-destructive" : "text-amber-600",
              )}
            />
            {title}
          </CardTitle>
          <Badge variant="secondary">
            {products.total} {products.total === 1 ? "product" : "products"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex min-h-0 flex-col gap-4">
        {products.items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
            <Package className="mx-auto mb-2 size-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
            {products.items.map((product) => (
              <ProductRow key={product.id} product={product} tone={tone} />
            ))}
          </div>
        )}

        <div className="mt-auto flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page</span>
            <Select
              value={String(products.pageSize)}
              onValueChange={(value: string | null) => {
                if (value) onPageSizeChange(Number(value));
              }}
            >
              <SelectTrigger
                size="sm"
                className="w-20"
                aria-label={`${title} rows per page`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <span className="text-sm text-muted-foreground">
              Page {products.page} of {products.totalPages}
            </span>
            {hasMultiplePages ? (
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(products.page - 1)}
                  disabled={products.page <= 1}
                  aria-label={`Previous ${title.toLowerCase()} page`}
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(products.page + 1)}
                  disabled={products.page >= products.totalPages}
                  aria-label={`Next ${title.toLowerCase()} page`}
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function StockAlerts({
  outOfStock,
  lowStock,
  onOutOfStockPageChange,
  onOutOfStockPageSizeChange,
  onLowStockPageChange,
  onLowStockPageSizeChange,
}: StockAlertsProps) {
  if (!outOfStock && !lowStock) return null;

  return (
    <div
      className={cn(
        "grid gap-6",
        outOfStock && lowStock && "xl:grid-cols-2",
      )}
    >
      {outOfStock ? (
        <StockSection
          title="Out of Stock Products"
          emptyMessage="No out-of-stock products."
          products={outOfStock}
          tone="danger"
          onPageChange={onOutOfStockPageChange}
          onPageSizeChange={onOutOfStockPageSizeChange}
        />
      ) : null}

      {lowStock ? (
        <StockSection
          title="Low Stock Products"
          emptyMessage="No low-stock products."
          products={lowStock}
          tone="warning"
          onPageChange={onLowStockPageChange}
          onPageSizeChange={onLowStockPageSizeChange}
        />
      ) : null}
    </div>
  );
}
