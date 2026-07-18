import api from "@/lib/axios";

import type {
  AddPurchasePaymentPayload,
  CreatePurchasePayload,
  PurchaseDetail,
  PurchaseListItem,
  UpdatePurchasePayload,
  UpdatePurchaseStatusPayload,
} from "@/types/purchases";

// ── List ──────────────────────────────────────────────────────────────────────

export interface PurchasesQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
}

export interface PurchasesMeta {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  totalCount: number;
}

export function purchasesKey(params: PurchasesQuery = {}) {
  const { search = "", page = 1, itemsPerPage = 20 } = params;
  return `/purchase?search=${encodeURIComponent(search)}&page=${page}&itemsPerPage=${itemsPerPage}`;
}

export const getPurchases = (
  query: PurchasesQuery = {},
): Promise<{ data: PurchaseListItem[]; meta: PurchasesMeta }> => {
  const { page = 1, itemsPerPage = 20, search } = query;

  return api.get("/purchase", {
    params: {
      page,
      itemsPerPage,
      ...(search ? { search } : {}),
    },
  }).then((r) => {
    const raw = r.data;
    const items: PurchaseListItem[] = Array.isArray(raw)
      ? raw
      : (raw.data ?? raw.purchases ?? []);
    const meta: PurchasesMeta = raw.meta ?? {
      currentPage: page,
      totalPages: 1,
      totalItems: items.length,
      itemsPerPage,
      totalCount: items.length,
    };
    return { data: items, meta };
  });
};

// ── Single ────────────────────────────────────────────────────────────────────

export const getPurchase = (id: string): Promise<PurchaseDetail> =>
  api.get(`/purchase/${id}`).then((r) => r.data as PurchaseDetail);

// ── Create ────────────────────────────────────────────────────────────────────

export const createPurchase = (
  payload: CreatePurchasePayload,
): Promise<{ message: string; purchaseId: string }> =>
  api.post("/purchase", payload).then((r) => r.data);

// ── Updates ───────────────────────────────────────────────────────────────────

export const updatePurchase = (
  id: string,
  payload: UpdatePurchasePayload,
): Promise<{ message: string }> =>
  api.put(`/purchase/${id}`, payload).then((r) => r.data);

export const updatePurchaseStatus = (
  id: string,
  payload: UpdatePurchaseStatusPayload,
): Promise<{ message: string }> =>
  updatePurchase(id, payload);

export const addPurchasePayment = (
  id: string,
  payload: AddPurchasePaymentPayload,
): Promise<{ message: string }> => updatePurchase(id, payload);
