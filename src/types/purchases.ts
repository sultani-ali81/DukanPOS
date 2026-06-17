// ── Enums ─────────────────────────────────────────────────────────────────────

export type PurchaseStatus = "Draft" | "Done" | "Cancelled" | "Pending";

export type PaymentMethod = "Cash" | "Bank Transfer" | "Cheque" | "Other";

export type StockInStatus = "Pending" | "Done" | "Cancelled";

// ── Shared sub-shapes ─────────────────────────────────────────────────────────

export interface PurchaseCustomer {
  id: string;
  name: string;
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
  /** ISO date string, e.g. "2026-05-06T00:00:00.000Z" */
  customDate: string;
  totalPrice: number;
  customer: PurchaseCustomer;
  items: PurchasedItemResponse[];
  totalItems: number;
  itemsPerPage: number;
  /** Stock-in records associated with this purchase */
  stockIns?: StockInResponse[];
}

// ── Detail (returned by GET /purchase/:id) ────────────────────────────────────

export type PurchaseDetail = PurchaseListItem;

// ── Create payload (sent to POST /purchase) ───────────────────────────────────

export interface CreatePurchasePayload {
  customerId: string;
  /** ISO date string from the date picker */
  purchaseDate: string;
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
}

// ── Update status payload (sent to PUT /purchase/:id) ─────────────────────

export interface UpdatePurchaseStatusPayload {
  status: PurchaseStatus;
}

// ── Payment ───────────────────────────────────────────────────────────────────

export interface CreatePaymentPayload {
  purchaseId: string;
  method: PaymentMethod;
  amount: number;
  paymentDate: string;
  notes?: string;
}

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
