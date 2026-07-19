// ── Enums ─────────────────────────────────────────────────────────────────────

export type PurchaseStatus = "Draft" | "Done" | "Cancelled";

export type PurchasePaymentStatus =
  | "unpaid"
  | "partially_paid"
  | "fully_paid";

export type StockInStatus = "Pending" | "Done" | "Cancelled";

// ── Shared sub-shapes ─────────────────────────────────────────────────────────

export interface PurchaseCustomer {
  id: string;
  name: string;
  phone?: string;
  address?: string;
}

export interface PurchasedProduct {
  id: string;
  name: string;
  price: number;
}

// ── Item shapes ───────────────────────────────────────────────────────────────

/** Used when sending items in a create payload */
export interface PurchaseItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/** A single product entry within a StockIn record — matches the "products" array the API returns */
export interface StockInItemResponse {
  productId: string;
  productName: string;
  purchasedItemId: string;
  quantity: number;
}

/** A StockIn record returned by the API */
export interface StockInResponse {
  stockInId: string;
  sequenceId: string;
  status: StockInStatus;
  inventoryId: string;
  inventoryName: string;
  inventoryAddress?: string;
  /** The API returns items under the key "products" */
  products: StockInItemResponse[];
  createdAt?: string;
}

/** Item shape returned by the API (list + detail) */
export interface PurchasedItemResponse {
  id: string;
  quantity: number;
  unitPrice: number;
  received: number;
  product: PurchasedProduct;
}

// ── List item (returned by GET /purchase) ─────────────────────────────────────

export interface PurchaseListItem {
  id: string;
  sequenceId: string;
  status: PurchaseStatus;
  paymentStatus: PurchasePaymentStatus;
  /** ISO date string, e.g. "2026-05-06T00:00:00.000Z" */
  customDate: string;
  totalPrice: number;
  customer: PurchaseCustomer;
  items: PurchasedItemResponse[];
  /** Stock-in records associated with this purchase */
  stockIns?: StockInResponse[];
  inventoryId?: string | null;
  inventoryName?: string | null;
  note?: string | null;
  createdAt?: string;
}

// ── Detail (returned by GET /purchase/:id) ────────────────────────────────────

export interface PurchasePaymentHistoryItem {
  id: string;
  amount: number;
  paidAt: string;
}

export interface PurchaseDetail extends PurchaseListItem {
  remainingBalance: number;
  paymentHistory: PurchasePaymentHistoryItem[];
}

// ── Create payload (sent to POST /purchase) ───────────────────────────────────

export interface CreatePurchasePayload {
  customerId: string;
  inventoryId: string;
  /** Calendar date in YYYY-MM-DD format. */
  customDate: string;
  note?: string;
  paymentStatus: PurchasePaymentStatus;
  /** Initial payment, when applicable. Always a number, never a string. */
  amount?: number;
  items: PurchaseItemPayload[];
}

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  filters?: Record<string, string | string[]>;
  sorts?: Record<string, "asc" | "desc">;
}

// ── UI helpers ────────────────────────────────────────────────────────────────

/** Generic autocomplete suggestion used in search comboboxes */
export interface Suggestion {
  id: string;
  label: string;
  sub?: string;
  price?: number;
}

// ── Update status payload (sent to PUT /purchase/:id) ─────────────────────

export interface UpdatePurchaseStatusPayload {
  status: PurchaseStatus;
}

export interface AddPurchasePaymentPayload {
  amount: number;
  paymentStatus: Exclude<PurchasePaymentStatus, "unpaid">;
}

export type UpdatePurchasePayload =
  | UpdatePurchaseStatusPayload
  | AddPurchasePaymentPayload;

// ── Stock-In types ────────────────────────────────────────────────────────────

export interface StockInItemPayload {
  purchaseItemId: string;
  quantity: number;
}

export interface CreateStockInPayload {
  purchaseId: string;
  inventoryId: string;
  items: StockInItemPayload[];
}

export interface UpdateStockInPayload {
  status: StockInStatus;
}

/** Item shape on the stock-in page — extends PurchasedItemResponse with received */
export interface PurchasedItemWithReceived extends PurchasedItemResponse {
  received: number;
}
