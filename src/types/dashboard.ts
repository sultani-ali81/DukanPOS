export type DashboardRange = "today" | "yesterday" | "last-week" | "monthly";

export interface DashboardStats {
  range: DashboardRange;
  sales: {
    total: number;
    percentageChange: number;
  };
  profit: {
    total: number;
    percentageChange: number;
  };
  lowStockProducts?: {
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
