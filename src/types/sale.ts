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

export interface FinalizeSaleResponse {
  message?: String;
  id: String;
  totalAmount: number;
  items: [CreateSaleResponse];
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
