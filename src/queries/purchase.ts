import api from "@/lib/axios";

import type {
  CreatePurchasePayload,
  PurchaseDetail,
  PurchaseListItem,
  UpdatePurchaseStatusPayload,
} from "@/types/purchases";

// ── List ──────────────────────────────────────────────────────────────────────

export interface PurchasesQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  status?: string;
}

export interface PurchasesMeta {
  total: number;
  page: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

// Status is now included in the key so SWR re-fetches when the filter changes
export function purchasesKey(params: PurchasesQuery = {}) {
  const { search = "", page = 1, itemsPerPage = 15, status = "" } = params;
  return `/purchase?search=${search}&page=${page}&itemsPerPage=${itemsPerPage}&status=${status}`;
}

export const getPurchases = (
  query: PurchasesQuery = {},
): Promise<{ data: PurchaseListItem[]; meta: PurchasesMeta }> =>
  api.get("/purchase", { params: query }).then((r) => {
    const raw = r.data;
    const items: PurchaseListItem[] = Array.isArray(raw)
      ? raw
      : (raw.data ?? raw.purchases ?? []);
    const meta: PurchasesMeta = raw.meta ?? {
      total: items.length,
      page: 1,
      totalPages: 1,
      itemsPerPage: items.length,
    };
    return { data: items, meta };
  });

// ── Single ────────────────────────────────────────────────────────────────────

export const getPurchase = (id: string): Promise<PurchaseDetail> =>
  api.get(`/purchase/${id}`).then((r) => r.data as PurchaseDetail);

// ── Create ────────────────────────────────────────────────────────────────────

export const createPurchase = (
  payload: CreatePurchasePayload,
): Promise<{ message: string }> => {
  const { purchaseDate, ...rest } = payload;
  return api
    .post("/purchase", { ...rest, customDate: purchaseDate })
    .then((r) => r.data);
};

// ── Update status ─────────────────────────────────────────────────────────────

export const updatePurchaseStatus = (
  id: string,
  payload: UpdatePurchaseStatusPayload,
): Promise<{ message: string }> =>
  api.put(`/purchase/${id}`, payload).then((r) => r.data);

// ── Delete (only valid when status is Draft) ──────────────────────────────────

export const deletePurchase = (id: string): Promise<{ message: string }> =>
  api.delete(`/purchase/${id}`).then((r) => r.data);
