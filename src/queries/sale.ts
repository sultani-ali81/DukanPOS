import api from "@/lib/axios";

// ── Sale ──────────────────────────────────────────────────────────────────────

import type {
  CreateSalePayload,
  CreateSaleResponse,
  CreateStockOutPayload,
  CreateStockOutResponse,
  DashboardStats,
  FinalizeSaleResponse,
  SaleListItem,
  SalesMeta,
} from "@/types/sale";

export async function createSale(
  payload: CreateSalePayload,
): Promise<CreateSaleResponse> {
  const res = await api.post("/sales", payload);
  return res.data;
}

export async function finalizeSale(
  payload: CreateSalePayload,
): Promise<FinalizeSaleResponse> {
  const res = await api.post("/sales/checkout", payload);
  return res.data;
}

export async function createStockOut(
  payload: CreateStockOutPayload,
): Promise<CreateStockOutResponse> {
  const res = await api.post("/stock-out", payload);
  return res.data;
}

export async function completeStockOut(
  id: string,
): Promise<{ message: string }> {
  const res = await api.put(`/stock-out/${id}`, { status: "Done" });
  return res.data;
}

export async function updateSale(id: string): Promise<{ message: string }> {
  const res = await api.put(`/sales/${id}`, { status: "Done" });
  return res.data;
}

export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get("/sales/dashboard").then((r) => r.data);

export const getRecentSales = (
  page = 1,
  itemsPerPage = 5,
): Promise<{ data: SaleListItem[]; meta: SalesMeta }> =>
  api.get("/sales", { params: { page, itemsPerPage } }).then((r) => {
    const raw = r.data;
    const items: SaleListItem[] = Array.isArray(raw) ? raw : (raw.data ?? []);
    const meta: SalesMeta = raw.meta ?? {
      currentPage: 1,
      itemsPerPage,
      totalItems: items.length,
      totalPages: 1,
    };
    return { data: items, meta };
  });
