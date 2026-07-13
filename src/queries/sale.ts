import api from "@/lib/axios";

import type {
  AddSalePaymentRequest,
  CheckoutSaleRequest,
  CheckoutSaleResponse,
  CreateSalePayload,
  CreateSaleResponse,
  CreateStockOutPayload,
  CreateStockOutResponse,
  FinalizeSaleResponse,
  PaginatedSales,
  SaleDetail,
  SaleListQuery,
  UpdateSalePayload,
  UpdateSaleResponse,
} from "@/types/sale";

// ── List ─────────────────────────────────────────────────────────────────────

export function salesKey(query: SaleListQuery = {}) {
  const { page = 1, itemsPerPage = 20, search = "" } = query;
  return `/sales?page=${page}&itemsPerPage=${itemsPerPage}&search=${encodeURIComponent(search)}`;
}

export async function getSales(
  query: SaleListQuery = {},
): Promise<PaginatedSales> {
  const { page = 1, itemsPerPage = 20, search } = query;
  const res = await api.get<PaginatedSales>("/sales", {
    params: {
      page,
      itemsPerPage,
      ...(search ? { search } : {}),
    },
  });
  return res.data;
}

// ── Detail ───────────────────────────────────────────────────────────────────

export async function getSale(id: string): Promise<SaleDetail> {
  const res = await api.get<SaleDetail>(`/sales/${id}`);
  return res.data;
}

// ── Checkout ─────────────────────────────────────────────────────────────────

export async function createSale(
  payload: CreateSalePayload,
): Promise<CreateSaleResponse> {
  const res = await api.post("/sales", payload);
  return res.data;
}

export function finalizeSale(
  payload: CheckoutSaleRequest,
): Promise<CheckoutSaleResponse>;
export function finalizeSale(
  payload: CreateSalePayload,
): Promise<FinalizeSaleResponse>;
export async function finalizeSale(
  payload: CheckoutSaleRequest | CreateSalePayload,
): Promise<CheckoutSaleResponse> {
  const res = await api.post<CheckoutSaleResponse>("/sales/checkout", payload);
  return res.data;
}

// ── Update status / collect payment ──────────────────────────────────────────

export function updateSale(id: string): Promise<UpdateSaleResponse>;
export function updateSale(
  id: string,
  payload: UpdateSalePayload,
): Promise<UpdateSaleResponse>;
export async function updateSale(
  id: string,
  payload: UpdateSalePayload = { status: "Done" },
): Promise<UpdateSaleResponse> {
  const res = await api.put<UpdateSaleResponse>(`/sales/${id}`, payload);
  return res.data;
}

export function addSalePayment(
  id: string,
  payload: AddSalePaymentRequest,
): Promise<UpdateSaleResponse> {
  return updateSale(id, payload);
}

// ── Legacy stock-out workflow ────────────────────────────────────────────────

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

/** Existing compact-list helper used by legacy dashboard/POS consumers. */
export const getRecentSales = (
  page = 1,
  itemsPerPage = 5,
): Promise<PaginatedSales> => getSales({ page, itemsPerPage });
