import { PageHeader } from "@/components/page-header";

import { StatCard } from "@/components/stat-card";

import { useDashboard } from "@/hooks/use-dashboard";

import { Badge } from "@/components/ui/badge";

import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { formatCurrency } from "@/lib/data";

import type { DashboardRange } from "@/types/dashboard";

import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign,
  TrendingUp,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { DateRangePicker } from "./components/date-range-picker";

import { SalesChart } from "./components/sales-chart";

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

function ChartSkeleton() {
  return (
    <div className="h-64 flex items-end justify-around gap-2 px-4 pb-2">
      {[60, 85, 40, 95, 55, 75, 50].map((h, i) => (
        <div key={i} className="flex-1 flex flex-col gap-1 items-center">
          <div
            className="w-full animate-pulse rounded-t-md bg-muted"
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
  );
}

// ── Range toggle ──────────────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; value: DashboardRange }[] = [
  { label: "Today", value: "today" },

  { label: "Yesterday", value: "yesterday" },

  { label: "Last 7 Days", value: "last-week" },

  { label: "This Month", value: "monthly" },
];

function formatTrend(pct: number): { value: string; positive: boolean } {
  const rounded = Math.round(pct);

  return {
    value: `${rounded >= 0 ? "+" : ""}${rounded}% vs previous period`,

    positive: pct >= 0,
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const navigate = useNavigate();

  const {
    range,

    setRange,

    customRange,

    setCustomRange,

    activeCustomRange,

    applyCustomRange,

    stats,

    loading,

    error,

    weeklyBreakdown,

    weeklyLoading,

    isCustomActive,

    hasChart,
  } = useDashboard();

  const lowStockCount =
    (stats?.outOfStockProducts?.length ?? 0) +
    (stats?.lowStockProducts?.length ?? 0);

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

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ── Toolbar: range toggles + date range picker ── */}

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={[
                "h-8 rounded-lg px-3.5 text-sm font-medium transition-colors",

                range === opt.value && !isCustomActive
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Custom date range picker */}

        <DateRangePicker
          value={customRange}
          onChange={setCustomRange}
          onApply={applyCustomRange}
          disabled={loading}
        />

        {isCustomActive && (
          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs">
            Custom range
          </Badge>
        )}
      </div>

      {/* ── Stat cards ── */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        {loading ? (
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

      {/* ── Chart — always visible, shows active range breakdown or falls back to last 7 days ── */}

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="size-4 text-muted-foreground" />

              {hasChart ? "Daily Breakdown" : "Last 7 Days"}
            </CardTitle>

            {hasChart && stats?.dailyBreakdown && (
              <span className="text-xs text-muted-foreground">
                {stats.dailyBreakdown[0]?.date} →{" "}
                {stats.dailyBreakdown[stats.dailyBreakdown.length - 1]?.date}
              </span>
            )}

            {!hasChart && weeklyBreakdown?.dailyBreakdown && (
              <span className="text-xs text-muted-foreground">
                {weeklyBreakdown.dailyBreakdown[0]?.date} →{" "}
                {
                  weeklyBreakdown.dailyBreakdown[
                    weeklyBreakdown.dailyBreakdown.length - 1
                  ]?.date
                }
              </span>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {(hasChart ? loading : weeklyLoading) ? (
            <ChartSkeleton />
          ) : (
            <SalesChart
              data={
                hasChart
                  ? (stats?.dailyBreakdown ?? [])
                  : (weeklyBreakdown?.dailyBreakdown ?? [])
              }
            />
          )}
        </CardContent>
      </Card>

      {/* ── Stock alerts ── */}

      {lowStockCount > 0 && !loading && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-destructive" />
              Stock Alerts
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(stats?.outOfStockProducts ?? []).map((p, i) => (
                <div
                  key={`out-${p.id}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>

                    <p className="text-xs text-gray-500">{p.inventoryName}</p>
                  </div>

                  <Badge className="shrink-0 bg-red-100 text-red-600 border-red-200 hover:bg-red-100">
                    Out of stock
                  </Badge>
                </div>
              ))}

              {(stats?.lowStockProducts ?? []).map((p, i) => (
                <div
                  key={`low-${p.id}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {p.name}
                    </p>

                    <p className="text-xs text-gray-500">{p.inventoryName}</p>
                  </div>

                  <Badge className="shrink-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                    {p.quantity} left
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
