import api from "@/lib/axios";

// ── Sale ──────────────────────────────────────────────────────────────────────

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSalePayload {
  customerId: string;
  inventoryId: string;
  items: SaleItemPayload[];
}

/** The backend returns the full sale object — we only need id and items */
export interface CreatedSaleItem {
  id: string; // this is the saleItemId needed for stock-out
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleResponse {
  id: string;
  message?: string;
  items: CreatedSaleItem[];
}

export async function createSale(
  payload: CreateSalePayload,
): Promise<CreateSaleResponse> {
  const res = await api.post("/sales", payload);
  return res.data;
}

// ── Stock-out ─────────────────────────────────────────────────────────────────

export interface StockOutItemPayload {
  saleItemId: string;
  quantity: number;
}

export interface CreateStockOutPayload {
  saleId: string;
  inventoryId: string;
  items: StockOutItemPayload[];
}

export interface CreateStockOutResponse {
  id: string;
  message?: string;
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
