// src/types/inventory.ts

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  status: StockStatus;
  lastUpdated: string;
}

export interface Inventory {
  id: string;
  name: string;
  address: string;
  productTypeCount: number;
  items: InventoryItem[];
}

export interface InventoryProductCategory {
  id: string;
  name: string;
}

export interface InventoryProductImage {
  id: string;
  imageUrlSigned: string;
}

export interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string | null;
  sequence?: string | null;
  categories: InventoryProductCategory[];
  images: InventoryProductImage[];
}

export interface InventoryDetail {
  id: string;
  name: string;
  address: string;
  products: InventoryProduct[];
}

// ── Pagination ────────────────────────────────────────────────────────────────

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

export interface PaginatedInventories {
  data: Inventory[];
  meta: PaginationMeta;
}

export interface GetInventoriesParams {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  totalPages?: number;
}

// ── Raw API response shapes ───────────────────────────────────────────────────

export interface RawInventoryItem {
  id: string;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  price?: number;
  status?: StockStatus;
  lastUpdated?: string;
  updatedAt?: string;
  createdAt?: string;
}

export interface RawInventory {
  id: string;
  name: string;
  address?: string;
  productTypeCount?: number;
  items?: RawInventoryItem[];
  products?: RawInventoryItem[];
}

export interface RawInventoryDetailProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  barcode?: string | null;
  sequence?: string | null;
  categories?: { id: string; name: string }[];
  images?: { id: string; imageUrlSigned: string }[];
}

export interface RawInventoryDetail {
  id: string;
  name: string;
  address?: string;
  products:
    | RawInventoryDetailProduct[]
    | {
        data: RawInventoryDetailProduct[];
        meta?: PaginationMeta;
      };
}
