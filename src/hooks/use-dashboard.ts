import type { DashboardQueryParams } from "@/queries/dashboard";
import { getDashboardStats } from "@/queries/dashboard";
import type {
  CashierBreakdown,
  DashboardRange,
  DashboardStats,
} from "@/types/dashboard";
import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface UseDashboardReturn {
  range: DashboardRange;
  setRange: (range: DashboardRange) => void;
  customRange: DateRange;
  setCustomRange: (range: DateRange) => void;
  activeCustomRange: DateRange;
  applyCustomRange: (range: DateRange) => void;
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  weeklyBreakdown: DashboardStats | null;
  weeklyLoading: boolean;
  cashierBreakdown: CashierBreakdown[];
  cashierLoading: boolean;
  isCustomActive: boolean;
  hasChart: boolean;
}

function buildParams(
  range: DashboardRange,
  activeCustomRange: DateRange,
): DashboardQueryParams {
  if (range === "custom" && activeCustomRange.from && activeCustomRange.to) {
    const toDate = new Date(activeCustomRange.to);
    toDate.setHours(23, 59, 59, 999);
    return {
      range: "custom",
      from: activeCustomRange.from.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
    };
  }
  return { range };
}

export function useDashboard(
  initialRange: DashboardRange = "today",
): UseDashboardReturn {
  const [range, setRangeState] = useState<DashboardRange>(initialRange);

  const [customRange, setCustomRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [activeCustomRange, setActiveCustomRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  // ── SWR: main stats (key changes when range or activeCustomRange changes) ──

  const mainParams = buildParams(range, activeCustomRange);

  const mainKey = [
    "dashboard",
    mainParams.range ?? null,
    mainParams.from ?? null,
    mainParams.to ?? null,
  ] as const;

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useSWR(mainKey, ([, r, f, t]) =>
    getDashboardStats({
      range: r as DashboardRange,
      from: f ?? undefined,
      to: t ?? undefined,
    }),
  );

  // ── SWR: weekly breakdown for chart fallback ──

  const { data: weeklyBreakdown, isLoading: weeklyLoading } = useSWR(
    ["dashboard", "last-week"] as const,
    () => getDashboardStats({ range: "last-week" }),
  );

  // ── SWR: cashier breakdown — always today, independent of range ──

  const { data: todayStats, isLoading: cashierLoading } = useSWR(
    ["dashboard", "today"] as const,
    () => getDashboardStats({ range: "today" }),
    { revalidateOnFocus: false },
  );

  // ── Loading + error ──

  const loading = statsLoading && !stats;

  const error: string | null = statsError
    ? (statsError?.response?.data?.message ??
      statsError?.message ??
      "Failed to load dashboard")
    : null;

  // ── Range handlers ──

  const setRange = useCallback((next: DashboardRange) => {
    setRangeState(next);
    setActiveCustomRange({ from: undefined, to: undefined });
  }, []);

  const applyCustomRange = useCallback((cr: DateRange) => {
    setActiveCustomRange(cr);
    setRangeState("custom");
  }, []);

  // ── Derived ──

  const isCustomActive =
    activeCustomRange.from !== undefined && activeCustomRange.to !== undefined;

  const hasChart = useMemo(
    () => !!stats?.dailyBreakdown && stats.dailyBreakdown.length > 0,
    [stats],
  );

  return {
    range,
    setRange,
    customRange,
    setCustomRange,
    activeCustomRange,
    applyCustomRange,
    stats: stats ?? null,
    loading,
    error,
    weeklyBreakdown: weeklyBreakdown ?? null,
    weeklyLoading,
    cashierBreakdown: todayStats?.cashierBreakdown ?? [],
    cashierLoading,
    isCustomActive,
    hasChart,
  };
}
