export type DashboardRange =
  | "today"
  | "yesterday"
  | "last-week"
  | "monthly"
  | "custom";

export interface DailyStats {
  date: string;
  dayName: string;
  sales: { total: number };
  profit: { total: number };
}

export interface DashboardSession {
  status: "open" | "closed";
  openingAmount?: number;
  closingAmount?: number;
  expectedAmount: number;
}

export interface StockProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  inventoryName: string;
}

export type DashboardStockProduct = StockProduct;

export interface PaginatedStockProducts {
  items: StockProduct[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CashierBreakdown {
  sessionId: string;
  employeeId: string;
  employeeName: string;
  totalSales: number;
  openingAmount: number;
  closingAmount: number | null;
  status: "open" | "closed";
  expectedAmount?: number | null;
  cashIn: number;
  cashOut: number;
}

export interface DashboardStats {
  range: DashboardRange;
  customRange?: { from: string; to: string };
  sales: { total: number; percentageChange: number };
  profit: { total: number; percentageChange: number };
  lowStockProducts?: PaginatedStockProducts;
  outOfStockProducts?: PaginatedStockProducts;
  dailyBreakdown?: DailyStats[];
  session?: DashboardSession;
  cashierBreakdown?: CashierBreakdown[];
}
