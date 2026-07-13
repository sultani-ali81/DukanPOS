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

export interface StockPaginationState {
  page: number;
  pageSize: number;
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
  setLowStockPage: (page: number) => void;
  setLowStockPageSize: (pageSize: number) => void;
  setOutOfStockPage: (page: number) => void;
  setOutOfStockPageSize: (pageSize: number) => void;
}

const DEFAULT_STOCK_PAGE = 1;
const DEFAULT_STOCK_PAGE_SIZE = 20;
const MAX_STOCK_PAGE_SIZE = 100;

function buildParams(
  range: DashboardRange,
  activeCustomRange: DateRange,
  lowStockPagination: StockPaginationState,
  outOfStockPagination: StockPaginationState,
): DashboardQueryParams {
  const paginationParams: DashboardQueryParams =
    range === "today"
      ? {
          lowStockPage: lowStockPagination.page,
          lowStockPageSize: lowStockPagination.pageSize,
          outOfStockPage: outOfStockPagination.page,
          outOfStockPageSize: outOfStockPagination.pageSize,
        }
      : {};

  if (range === "custom" && activeCustomRange.from && activeCustomRange.to) {
    const toDate = new Date(activeCustomRange.to);
    toDate.setHours(23, 59, 59, 999);
    return {
      range: "custom",
      from: activeCustomRange.from.toISOString().split("T")[0],
      to: toDate.toISOString().split("T")[0],
      ...paginationParams,
    };
  }
  return { range, ...paginationParams };
}

export function useDashboard(
  initialRange: DashboardRange = "today",
): UseDashboardReturn {
  const [range, setRangeState] = useState<DashboardRange>(initialRange);

  const [customRange, setCustomRangeState] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [activeCustomRange, setActiveCustomRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });

  const [lowStockPagination, setLowStockPagination] =
    useState<StockPaginationState>({
      page: DEFAULT_STOCK_PAGE,
      pageSize: DEFAULT_STOCK_PAGE_SIZE,
    });

  const [outOfStockPagination, setOutOfStockPagination] =
    useState<StockPaginationState>({
      page: DEFAULT_STOCK_PAGE,
      pageSize: DEFAULT_STOCK_PAGE_SIZE,
    });

  const mainParams = buildParams(
    range,
    activeCustomRange,
    lowStockPagination,
    outOfStockPagination,
  );

  const mainKey = [
    "dashboard",
    mainParams.range ?? null,
    mainParams.from ?? null,
    mainParams.to ?? null,
    mainParams.lowStockPage ?? null,
    mainParams.lowStockPageSize ?? null,
    mainParams.outOfStockPage ?? null,
    mainParams.outOfStockPageSize ?? null,
  ] as const;

  const { data: stats, isLoading: statsLoading, error: statsError } = useSWR(
    mainKey,
    () => getDashboardStats(mainParams),
  );

  const hasChart = useMemo(
    () => !!stats?.dailyBreakdown && stats.dailyBreakdown.length > 0,
    [stats],
  );

  // Fetch the weekly fallback only after the main response proves it is needed.
  const shouldFetchWeeklyFallback =
    !!stats && !statsLoading && !hasChart && range !== "last-week";

  const { data: weeklyFallback, isLoading: weeklyFallbackLoading } = useSWR(
    shouldFetchWeeklyFallback
      ? (["dashboard", "weekly-fallback", "last-week"] as const)
      : null,
    () => getDashboardStats({ range: "last-week" }),
  );

  // Today's main response already contains cashier data. Only make a separate
  // today request while another range is active, and minimize its stock payload.
  const shouldFetchTodayCashiers = range !== "today";

  const { data: todayStats, isLoading: todayStatsLoading } = useSWR(
    shouldFetchTodayCashiers
      ? (["dashboard", "cashier-breakdown-today"] as const)
      : null,
    () =>
      getDashboardStats({
        range: "today",
        lowStockPage: 1,
        lowStockPageSize: 1,
        outOfStockPage: 1,
        outOfStockPageSize: 1,
      }),
    { revalidateOnFocus: false },
  );

  // ── Loading + error ──

  const loading = statsLoading && !stats;
  const weeklyLoading =
    loading || (shouldFetchWeeklyFallback && weeklyFallbackLoading);
  const cashierLoading =
    range === "today" ? loading : todayStatsLoading && !todayStats;

  const error: string | null = statsError
    ? (statsError?.response?.data?.message ??
      statsError?.message ??
      "Failed to load dashboard")
    : null;

  // ── Range handlers ──

  const resetStockPages = useCallback(() => {
    setLowStockPagination((current) => ({ ...current, page: 1 }));
    setOutOfStockPagination((current) => ({ ...current, page: 1 }));
  }, []);

  const setRange = useCallback(
    (next: DashboardRange) => {
      setRangeState(next);
      setActiveCustomRange({ from: undefined, to: undefined });
      resetStockPages();
    },
    [resetStockPages],
  );

  const setCustomRange = useCallback((next: DateRange) => {
    setCustomRangeState(next);
  }, []);

  const applyCustomRange = useCallback(
    (cr: DateRange) => {
      setActiveCustomRange(cr);
      setRangeState("custom");
      resetStockPages();
    },
    [resetStockPages],
  );

  const preserveReturnedLowStockPagination = useCallback(() => {
    if (!stats?.lowStockProducts) return;

    const { page, pageSize } = stats.lowStockProducts;
    setLowStockPagination((current) =>
      current.page === page && current.pageSize === pageSize
        ? current
        : { page, pageSize },
    );
  }, [stats]);

  const preserveReturnedOutOfStockPagination = useCallback(() => {
    if (!stats?.outOfStockProducts) return;

    const { page, pageSize } = stats.outOfStockProducts;
    setOutOfStockPagination((current) =>
      current.page === page && current.pageSize === pageSize
        ? current
        : { page, pageSize },
    );
  }, [stats]);

  const setLowStockPage = useCallback(
    (page: number) => {
      preserveReturnedOutOfStockPagination();
      setLowStockPagination((current) => ({
        page: Math.max(1, Math.trunc(page)),
        pageSize: stats?.lowStockProducts?.pageSize ?? current.pageSize,
      }));
    },
    [preserveReturnedOutOfStockPagination, stats],
  );

  const setLowStockPageSize = useCallback(
    (pageSize: number) => {
      preserveReturnedOutOfStockPagination();
      setLowStockPagination({
        page: 1,
        pageSize: Math.min(
          MAX_STOCK_PAGE_SIZE,
          Math.max(1, Math.trunc(pageSize)),
        ),
      });
    },
    [preserveReturnedOutOfStockPagination],
  );

  const setOutOfStockPage = useCallback(
    (page: number) => {
      preserveReturnedLowStockPagination();
      setOutOfStockPagination((current) => ({
        page: Math.max(1, Math.trunc(page)),
        pageSize: stats?.outOfStockProducts?.pageSize ?? current.pageSize,
      }));
    },
    [preserveReturnedLowStockPagination, stats],
  );

  const setOutOfStockPageSize = useCallback(
    (pageSize: number) => {
      preserveReturnedLowStockPagination();
      setOutOfStockPagination({
        page: 1,
        pageSize: Math.min(
          MAX_STOCK_PAGE_SIZE,
          Math.max(1, Math.trunc(pageSize)),
        ),
      });
    },
    [preserveReturnedLowStockPagination],
  );

  // ── Derived ──

  const isCustomActive =
    activeCustomRange.from !== undefined && activeCustomRange.to !== undefined;

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
    weeklyBreakdown: shouldFetchWeeklyFallback
      ? (weeklyFallback ?? null)
      : null,
    weeklyLoading,
    cashierBreakdown:
      (range === "today" ? stats : todayStats)?.cashierBreakdown ?? [],
    cashierLoading,
    isCustomActive,
    hasChart,
    setLowStockPage,
    setLowStockPageSize,
    setOutOfStockPage,
    setOutOfStockPageSize,
  };
}
