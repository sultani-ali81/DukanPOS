import api from "@/lib/axios";
import type { DashboardRange, DashboardStats } from "@/types/dashboard";

export interface DashboardQueryParams {
  range?: DashboardRange;
  from?: string;
  to?: string;
}

export const getDashboardStats = (
  params: DashboardQueryParams | DashboardRange = "today",
): Promise<DashboardStats> => {
  const query: Record<string, string> =
    typeof params === "string"
      ? { range: params }
      : {
          ...(params.range ? { range: params.range } : {}),
          ...(params.from ? { from: params.from } : {}),
          ...(params.to ? { to: params.to } : {}),
        };

  return api.get("/dashboard", { params: query }).then((r) => r.data);
};
