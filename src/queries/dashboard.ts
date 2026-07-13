import api from "@/lib/axios";
import type { DashboardRange, DashboardStats } from "@/types/dashboard";

export interface DashboardQueryParams {
  range?: DashboardRange;
  from?: string;
  to?: string;
  lowStockPage?: number;
  lowStockPageSize?: number;
  outOfStockPage?: number;
  outOfStockPageSize?: number;
}

export const getDashboardStats = (
  params: DashboardQueryParams | DashboardRange = "today",
): Promise<DashboardStats> => {
  const query: Record<string, string | number> =
    typeof params === "string"
      ? { range: params }
      : {
          ...(params.range ? { range: params.range } : {}),
          ...(params.from ? { from: params.from } : {}),
          ...(params.to ? { to: params.to } : {}),
          ...(params.lowStockPage !== undefined
            ? { lowStockPage: params.lowStockPage }
            : {}),
          ...(params.lowStockPageSize !== undefined
            ? { lowStockPageSize: params.lowStockPageSize }
            : {}),
          ...(params.outOfStockPage !== undefined
            ? { outOfStockPage: params.outOfStockPage }
            : {}),
          ...(params.outOfStockPageSize !== undefined
            ? { outOfStockPageSize: params.outOfStockPageSize }
            : {}),
        };

  return api
    .get<DashboardStats>("/dashboard", { params: query })
    .then((r) => r.data);
};
