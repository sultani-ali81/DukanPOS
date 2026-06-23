"use client";

import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data";
import { getDashboardStats } from "@/queries/dashboard";
import { getProducts } from "@/queries/products";
import type { DashboardRange, DashboardStats } from "@/types/dashboard";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// ── Skeletons ─────────────────────────────────────────────────────────────────

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

// ── Range toggle ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; value: DashboardRange }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last Week", value: "last-week" },
  { label: "Monthly", value: "monthly" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTrend(pct: number): { value: string; positive: boolean } {
  const rounded = Math.round(pct);
  return {
    value: `${rounded}% vs previous period`,
    positive: pct >= 0,
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [range, setRange] = useState<DashboardRange>("today");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Initial load: stats + sales + products in parallel ───────────────────

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      getDashboardStats(range).catch((e) => {
        setError((e as Error).message ?? "Failed to load dashboard");
        return null;
      }),
      getProducts({ page: 1, itemsPerPage: 1 }).catch(() => ({
        data: [],
        meta: { totalItems: 0 },
      })),
    ])
      .then(([statsRes]) => {
        if (statsRes) setStats(statsRes);
      })
      .finally(() => setIsLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Re-fetch only stats when range changes ────────────────────────────────

  useEffect(() => {
    setStatsLoading(true);
    setError(null);
    getDashboardStats(range)
      .then((res) => setStats(res))
      .catch((e) => setError((e as Error).message ?? "Failed to load stats"))
      .finally(() => setStatsLoading(false));
  }, [range]);

  const lowStockCount =
    (stats?.lowStockProducts?.length ?? 0) +
    (stats?.outOfStockProducts?.length ?? 0);

  const showStatsLoading = isLoading || statsLoading;

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

      {/* ── Range toggle ── */}
      <div className="mb-4 flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1 w-fit">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setRange(opt.value)}
            className={[
              "h-8 rounded-lg px-3.5 text-sm font-medium transition-colors",
              range === opt.value
                ? "bg-white text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {showStatsLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Sales"
              value={formatCurrency(stats?.sales?.total ?? 0)}
              icon={DollarSign}
              trend={formatTrend(stats?.sales?.percentageChange ?? 0)}
            />
            <StatCard
              label="Profit"
              value={formatCurrency(stats?.profit?.total ?? 0)}
              icon={TrendingUp}
              trend={formatTrend(stats?.profit?.percentageChange ?? 0)}
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

      {/* Stock Alerts */}
      {lowStockCount > 0 && !isLoading && !statsLoading ? (
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
