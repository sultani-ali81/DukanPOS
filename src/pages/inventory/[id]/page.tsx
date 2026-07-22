// src/pages/inventory/[id]/page.tsx
import LogsTable from "@/components/logs-table";
import { PageHeader } from "@/components/page-header";
import { SearchField } from "@/components/search-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useInventoryDetail } from "@/hooks/use-inventory-detail";
import { formatCurrency } from "@/lib/currency";
import { getStockStatus, type StockFilter } from "@/lib/stock-status";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowLeftRight,
  MapPin,
  Package,
  Search,
  Warehouse,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

function StockBadge({ quantity }: { quantity: number }) {
  const status = getStockStatus(quantity);

  if (status === "Out of Stock")
    return (
      <Badge className="bg-red-50 text-red-600 border-red-200 hover:bg-red-50">
        Out of Stock
      </Badge>
    );
  if (status === "Low Stock")
    return (
      <Badge className="bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50">
        Low Stock
      </Badge>
    );
  return (
    <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
      In Stock
    </Badge>
  );
}

function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: "gray" | "green" | "amber" | "red";
}) {
  const colors = {
    gray: "bg-gray-50 border-gray-200 text-gray-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
    red: "bg-red-50 border-red-200 text-red-600",
  };

  return (
    <div className={cn("rounded-xl border p-4", colors[accent])}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs opacity-60">{sub}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

const STATUS_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "in_stock", label: "In Stock" },
  { value: "low_stock", label: "Low Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export default function InventoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const {
    inventory,
    loading,
    error,
    filtered,
    totalFiltered,
    page,
    setPage,
    totalPages,
    search,
    handleSearch,
    clearSearch,
    status,
    setStatus,
    stats,
  } = useInventoryDetail(id ?? "");

  if (error) {
    return (
      <div>
        <PageHeader title="Inventory" description="">
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            <ArrowLeft className="size-4" /> Back
          </Button>
        </PageHeader>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <PageHeader
        title={loading ? "Loading\u2026" : (inventory?.name ?? "Inventory")}
      >
        <div className="flex w-full flex-col gap-2 min-[480px]:flex-row sm:w-auto">
          <Button
            variant="outline"
            onClick={() =>
              navigate("/stock-movement/new", {
                state: { sourceInventoryId: id },
              })
            }
          >
            <ArrowLeftRight className="size-4" />
            Transfer Stock
          </Button>
          <Button variant="outline" onClick={() => navigate("/inventory")}>
            <ArrowLeft className="size-4" />
            Back to Inventories
          </Button>
        </div>
      </PageHeader>
      {inventory?.address && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-4 mb-4">
          <MapPin className="size-3.5 shrink-0" />
          {inventory.address}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile
          label="Products"
          value={String(stats.total)}
          sub="distinct SKUs"
          accent="gray"
        />
        <StatTile
          label="Total Units"
          value={stats.totalUnits.toLocaleString()}
          sub="across all products"
          accent="gray"
        />
        <StatTile
          label="Stock Value"
          value={formatCurrency(stats.stockValue)}
          sub="at selling price"
          accent="gray"
        />
        <StatTile
          label="In Stock"
          value={String(stats.inStock)}
          sub="qty > 10"
          accent="green"
        />
        <StatTile
          label="Low Stock"
          value={String(stats.lowStock)}
          sub="qty 1–10"
          accent="amber"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <SearchField
          value={search}
          onValueChange={handleSearch}
          onClear={clearSearch}
          placeholder="Search products…"
          aria-label="Search inventory products"
          className="w-full sm:w-72"
        />

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatus(opt.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                status === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-accent",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 items-center text-center">
                <TableHead className="w-14 text-center">Image</TableHead>
                <TableHead className="text-center">Product</TableHead>
                <TableHead className="text-center">Categories</TableHead>
                <TableHead className="text-center">Price</TableHead>
                <TableHead className="text-center">Quantity</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-14 text-center text-sm text-muted-foreground"
                  >
                    {search ? (
                      <>
                        <Search className="mx-auto mb-2 size-8 opacity-30" />
                        No products match &ldquo;{search}&rdquo;
                      </>
                    ) : (
                      <>
                        <Package className="mx-auto mb-2 size-8 opacity-30" />
                        No products in this inventory yet.
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((product) => {
                  const firstImage = product.images?.[0];
                  return (
                    <TableRow key={product.id} className="hover:bg-muted/40">
                      {/* Thumbnail */}
                      <TableCell className="py-2 text-center">
                        {firstImage ? (
                          <img
                            src={firstImage.imageUrlSigned}
                            alt={product.name}
                            className="size-10 rounded-lg object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                            <Warehouse className="size-4 text-muted-foreground/40" />
                          </div>
                        )}
                      </TableCell>

                      {/* Name */}
                      <TableCell className="font-medium text-center">
                        {product.name}
                      </TableCell>

                      {/* Categories */}
                      <TableCell className="text-center">
                        <div className="flex flex-wrap gap-1 justify-center items-center">
                          {product.categories.length > 0 ? (
                            product.categories.map((c) => (
                              <Badge
                                key={c.id}
                                variant="outline"
                                className="text-xs"
                              >
                                {c.name}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              —
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {/* Price */}
                      <TableCell className="text-center tabular-nums">
                        {formatCurrency(product.price)}
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="text-center tabular-nums font-semibold">
                        {product.quantity}
                      </TableCell>

                      {/* Status */}
                      <TableCell className="text-center">
                        <StockBadge quantity={product.quantity} />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Pagination + count ── */}
      {!loading && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {totalFiltered} product{totalFiltered !== 1 ? "s" : ""}
            {search ? ` matching "${search}"` : ""}
          </span>
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </div>
      )}

      {/* ── Low stock alert panel ── */}
      {!loading && stats.lowStock + stats.outOfStock > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">Stock Alerts</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(inventory?.products ?? [])
              .filter((p) => getStockStatus(p.quantity) !== "In Stock")
              .sort((a, b) => a.quantity - b.quantity)
              .slice(0, 6)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-white border border-amber-100 px-3 py-2"
                >
                  <span className="text-sm font-medium text-gray-800 truncate mr-2">
                    {p.name}
                  </span>
                  <StockBadge quantity={p.quantity} />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Audit history */}
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-lg">Logs History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <LogsTable entityId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
