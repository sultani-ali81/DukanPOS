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

// ── Receipt ───────────────────────────────────────────────────────────────────

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

// ── Finalize sale response ────────────────────────────────────────────────────

export interface FinalizeSaleResponse {
  message?: string;
  saleId: string;
  receipt: SaleReceipt;
  createdAt: string;
}

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

// ── Dashboard ─────────────────────────────────────────────────────────────────

// ── Sales list ────────────────────────────────────────────────────────────────

export interface SaleListItem {
  id: string;
  customerId: string;
  inventoryId: string;
  totalPrice: number;
  status: string;
  createdAt: string;
  customer: { id: string; name: string };
  items: { id: string; quantity: number; unitPrice: number }[];
  sequenceId: string;
}

export interface SalesMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
