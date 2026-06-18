"use client";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data";
import { getProducts } from "@/queries/products";
import {
  getDashboardStats,
  getRecentSales,
  type DashboardStats,
  type SaleListItem,
} from "@/queries/sale";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="space-y-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
        </div>
        <div className="size-12 animate-pulse rounded-xl bg-muted" />
      </CardContent>
    </Card>
  );
}

function SaleRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="space-y-1.5">
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        <div className="h-3 w-36 animate-pulse rounded bg-muted" />
      </div>
      <div className="space-y-1 text-right">
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        <div className="h-3 w-12 animate-pulse rounded bg-muted ml-auto" />
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTrend(pct: number): { value: string; positive: boolean } {
  const rounded = Math.round(pct);
  return {
    value: `${rounded}% vs yesterday`,
    positive: pct >= 50,
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<SaleListItem[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboardStats().catch((e) => {
        setError((e as Error).message ?? "Failed to load dashboard");
        return null;
      }),
      getRecentSales(1, 5).catch(() => ({ data: [], meta: {} })),
      getProducts({ page: 1, itemsPerPage: 1 }).catch(() => ({
        data: [],
        meta: { totalItems: 0 },
      })),
    ])
      .then(([statsRes, salesRes, productsRes]) => {
        if (statsRes) setStats(statsRes);
        if (salesRes) setRecentSales(salesRes.data);
        if (productsRes) setTotalProducts(productsRes.meta.totalItems ?? 0);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const lowStockCount =
    (stats?.lowStockProducts?.length ?? 0) +
    (stats?.outOfStockProducts?.length ?? 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back, here is your store at a glance."
      >
        <Button onClick={() => navigate("/pos")}>
          New Sale <ArrowRight className="size-4" />
        </Button>
      </PageHeader>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Today's Sales"
              value={formatCurrency(stats?.todaySales?.total ?? 0)}
              icon={DollarSign}
              trend={formatTrend(stats?.todaySales?.percentageChange ?? 0)}
            />
            <StatCard
              label="Today's Profit"
              value={formatCurrency(stats?.todayProfit?.total ?? 0)}
              icon={TrendingUp}
              trend={formatTrend(stats?.todayProfit?.percentageChange ?? 0)}
            />
            <StatCard
              label="Out of Stock"
              value={String(stats?.outOfStockProducts?.length ?? 0)}
              icon={AlertTriangle}
              accent="rose"
              trend={{
                value:
                  (stats?.outOfStockProducts?.length ?? 0) > 0
                    ? "Needs restocking"
                    : "All stocked",

                positive: (stats?.outOfStockProducts?.length ?? 0) === 0,
              }}
            />
            <StatCard
              label="Low Stock Items"
              value={String(lowStockCount)}
              icon={AlertTriangle}
              accent="amber"
              trend={{
                value: lowStockCount > 0 ? "Needs attention" : "All good",
                positive: lowStockCount === 0,
              }}
            />
          </>
        )}
      </div>

      {/* Recent Sales */}
      <div className="mt-6">
        <div className="mb-3 flex flex-row items-center justify-between">
          <h3 className="text-base font-semibold text-foreground">
            Recent Sales
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/reports")}
          >
            View all
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <SaleRowSkeleton key={i} />
            ))}
          </div>
        ) : recentSales.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No sales recorded today yet.
          </div>
        ) : (
          <div className="space-y-2">
            {recentSales.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    #{s.sequenceId}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.customer?.name ?? "Walk-in"} · {s.items?.length ?? 0}{" "}
                    items · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-foreground">
                    {formatCurrency(s.totalPrice ?? 0)}
                  </p>
                  <Badge
                    variant={s.status === "Completed" ? "secondary" : "outline"}
                    className="mt-0.5 text-xs"
                  >
                    {s.status ?? "—"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Low Stock + Out of Stock Alerts */}
      {lowStockCount > 0 && !isLoading ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-destructive" />
              Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(stats?.lowStockProducts ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.inventoryName}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {p.quantity} left
                </Badge>
              </div>
            ))}
            {(stats?.outOfStockProducts ?? []).map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.inventoryName}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  Out of stock
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
