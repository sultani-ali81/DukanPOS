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

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardStats {
  todaySales: {
    total: number;
    percentageChange: number;
  };
  todayProfit: {
    total: number;
    percentageChange: number;
  };
  lowStockProducts: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    inventoryName: string;
  }[];
  outOfStockProducts: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    inventoryName: string;
  }[];
}

/** GET /sales/dashboard */
export const getDashboardStats = (): Promise<DashboardStats> =>
  api.get("/sales/dashboard").then((r) => r.data);

// ── Recent Sales ──────────────────────────────────────────────────────────────

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

/** GET /sales — paginated, for the recent sales list */
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
