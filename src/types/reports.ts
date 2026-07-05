export interface ReportSequence {
  id: string;
  prefix: string;
  lastIndex: number;
}

export interface ReportCustomerRef {
  id: string;
  name: string;
}

export interface ReportProductRef {
  id: string;
  name: string;
  price?: number;
}

export interface SaleReportItem {
  id: string;
  sale: string;
  product: ReportProductRef;
  quantity: number;
  unitPrice: number;
}

export interface SaleReportRow {
  id: string;
  status: string;
  sequence: ReportSequence;
  customer: ReportCustomerRef;
  createdAt: string;
  items: SaleReportItem[];
}

export interface InventoryStockQuantity {
  id: string;
  inventory: string;
  product: ReportProductRef;
  quantity: number;
}

export interface InventoryReportRow {
  id: string;
  name: string;
  address: string;
  createdAt: string;
  products: ReportProductRef[];
  stockQuantities: InventoryStockQuantity[];
}

export interface CashMovementEmployeeRef {
  id: string;
  email: string;
  name: string;
  role: string;
}

export interface CashMovementReportRow {
  id: string;
  storeSession: { id: string };
  type: "cash_in" | "cash_out";
  amount: number;
  note: string | null;
  createdBy: CashMovementEmployeeRef;
  status: string;
  createdAt: string;
}

export type ReportType =
  | "sale"
  | "purchase"
  | "inventory"
  | "stock_in"
  | "stock_out"
  | "payment"
  | "cash_movement";

export interface ReportMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount: number;
  filters: Record<string, unknown>;
}

export interface ReportResponse<T> {
  type: ReportType;
  data: T[];
  meta: ReportMeta;
}

export interface ReportColumn<T> {
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
}

export interface StockItem {
  id: string;
  product: ReportProductRef;
  quantity: number;
}

export interface StockReportRow {
  id: string;
  inventory: { id: string; name: string };
  purchase?: { id: string };
  sequence: ReportSequence;
  status: string;
  createdAt: string;
  items: StockItem[];
}
