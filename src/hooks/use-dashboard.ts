import type { DashboardQueryParams } from "@/queries/dashboard";

import { getDashboardStats } from "@/queries/dashboard";

import type { DashboardRange, DashboardStats } from "@/types/dashboard";

import { useCallback, useMemo, useState } from "react";

import useSWR from "swr";

// Date range types come from the picker component to avoid a circular dep

export interface DateRange {
  from: Date | undefined;

  to: Date | undefined;
}

export interface UseDashboardReturn {
  // Range state (consumed by range toggle UI)

  range: DashboardRange;

  setRange: (range: DashboardRange) => void;

  // Custom range (picker — local state until applied)

  customRange: DateRange;

  setCustomRange: (range: DateRange) => void;

  activeCustomRange: DateRange;

  applyCustomRange: (range: DateRange) => void;

  // Main stats — depends on range + activeCustomRange

  stats: DashboardStats | null;

  loading: boolean;

  error: string | null;

  // Chart fallback (always fetched independently on mount)

  weeklyBreakdown: DashboardStats | null;

  weeklyLoading: boolean;

  // Derived

  isCustomActive: boolean;

  hasChart: boolean;
}

/**

 * Build the API params based on selected range + active custom range.

 */

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

/**

 * Dashboard hook — SWR-based, replaces three useState chains + two useEffects.

 *

 * Before:

 *   - 1 useEffect for initial fetch (range + last-week breakdown)

 *   - 1 useEffect for range change

 *   - 4 useState for range/customRange/activeCustomRange/stats/loading/error

 *   - 1 useState pair for weeklyBreakdown

 *   - Manual fetchStats() function duplicated logic

 *

 * After:

 *   - One SWR call per "fetch concern" (main stats, weekly breakdown)

 *   - Range change = key change = automatic re-fetch

 *   - Custom date apply = key change = automatic re-fetch

 *   - Last-week breakdown cached separately, never re-fetched

 */

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

    mutate: refreshStats,
  } = useSWR(mainKey, ([, r, f, t]) =>
    getDashboardStats({
      range: r as DashboardRange,
      from: f ?? undefined,
      to: t ?? undefined,
    }),
  );

  // ── SWR: weekly breakdown for chart fallback (independent fetch) ──

  const {
    data: weeklyBreakdown,

    isLoading: weeklyLoading,
  } = useSWR(["dashboard", "last-week"] as const, () =>
    getDashboardStats({ range: "last-week" }),
  );

  // ── Loading flags ──

  // First-load only — re-fetches keep showing previous data (stale-while-revalidate)

  const hasMainData = !!stats;

  const loading = statsLoading && !hasMainData;

  const error: string | null = statsError
    ? (statsError?.response?.data?.message ??
      statsError?.message ??
      "Failed to load dashboard")
    : null;

  // ── Range handlers ──

  const setRange = useCallback((next: DashboardRange) => {
    setRangeState(next);

    // Switching to a preset range clears the active custom range

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

    isCustomActive,

    hasChart,
  };
}
