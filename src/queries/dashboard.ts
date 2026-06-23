import api from "@/lib/axios";
import type { DashboardRange, DashboardStats } from "@/types/dashboard";

export const getDashboardStats = (
  range: DashboardRange = "today",
): Promise<DashboardStats> =>
  api.get("/dashboard", { params: { range } }).then((r) => r.data);
