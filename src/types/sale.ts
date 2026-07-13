// ── Sales domain ─────────────────────────────────────────────────────────────

export type AllowedSaleRole = "Admin" | "Cashier";

export type SaleStatus = "Draft" | "Done" | "Cancelled";

export type SalePaymentStatus = "fully_paid" | "partially_paid" | "unpaid";

export interface SaleCustomer {
  id: string;
  name: string;
}

export interface SaleListItem {
  id: string;
  sequenceId: string;
  status: SaleStatus;
  paymentStatus: SalePaymentStatus;
  customer: SaleCustomer;
  totalPrice: number;
  createdAt?: string;
}

export interface SaleDetailItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
  product: {
    id: string;
    name: string;
  };
}

export interface SalePaymentCashier {
  id: string;
  firstName: string;
  lastName: string;
}

export interface SalePaymentHistoryItem {
  id: string;
  amount: number;
  paidAt: string;
  cashier: SalePaymentCashier | null;
}

export interface SaleDetail extends SaleListItem {
  items: SaleDetailItem[];
  remainingBalance: number;
  paymentHistory: SalePaymentHistoryItem[];
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  filters?: Record<string, string | string[]>;
}

export interface PaginatedSales {
  data: SaleListItem[];
  meta: PaginationMeta;
}

export interface SaleListQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
}

export type SalesMeta = PaginationMeta;

// ── Checkout ─────────────────────────────────────────────────────────────────

export interface SaleItemPayload {
  productId: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Legacy create payload used by the existing POS screen.
 * New checkout screens should use CheckoutSaleRequest, where paymentStatus is
 * required by the current backend contract.
 */
export interface CreateSalePayload {
  customerId: string;
  inventoryId: string;
  items: SaleItemPayload[];
  paymentStatus?: SalePaymentStatus;
  amount?: number;
}

export interface CheckoutSaleRequest extends CreateSalePayload {
  paymentStatus: SalePaymentStatus;
}

// ── Receipt ──────────────────────────────────────────────────────────────────

export interface SaleReceiptItem {
  productName: string;
  quantity: number;
  unitPrice: number;
  subTotal: number;
}

export interface SaleReceipt {
  receiptId: string;
  storeName: string;
  sequenceId: string;
  customerName: string;
  totalAmount: number;
  items: SaleReceiptItem[];
}

export interface CheckoutSaleResponse {
  message: string;
  saleId: string;
  receipt: SaleReceipt;
  createdAt?: string;
}

/** Kept for the existing POS receipt callback, whose API currently returns it. */
export interface FinalizeSaleResponse extends CheckoutSaleResponse {
  createdAt: string;
}

// ── Sale updates and additional payments ─────────────────────────────────────

export interface UpdateSaleStatusPayload {
  status: SaleStatus;
}

export interface AddSalePaymentRequest {
  amount: number;
  paymentStatus: Exclude<SalePaymentStatus, "unpaid">;
}

export type AddSalePaymentPayload = AddSalePaymentRequest;

export type UpdateSalePayload = UpdateSaleStatusPayload | AddSalePaymentRequest;

export interface UpdateSaleResponse {
  message: string;
}

// ── Legacy create and stock-out responses ────────────────────────────────────

export interface CreatedSaleItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateSaleResponse {
  id: string;
  message?: string;
  items: CreatedSaleItem[];
}

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
