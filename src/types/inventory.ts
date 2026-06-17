// ── Public domain types ───────────────────────────────────────────────────────

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

/** Lightweight summary used in the paginated list (GET /inventory). */
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  status: StockStatus;
  lastUpdated: string; // ISO yyyy-mm-dd
}

/** Inventory summary as returned by GET /inventory (list). */
export interface Inventory {
  id: string;
  name: string;
  address: string;
  items: InventoryItem[];
}

/**
 * A product inside a single inventory, as returned by GET /inventory/:id.
 * The backend joins product fields with the StockQuantity row for that inventory.
 */
export interface InventoryProduct {
  id: string;
  name: string;
  price: number;
  quantity: number; // from StockQuantity
  image?: string;
}

/** Full inventory detail returned by GET /inventory/:id. */
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

// ── Query param types ─────────────────────────────────────────────────────────

export interface GetInventoriesParams {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  totalPages?: number;
}

// ── Raw API response shapes (internal — not exported) ─────────────────────────
// These mirror exactly what the backend sends before mapping. They live here so
// the query file stays focused on logic, and so they're co-located with the
// domain types they map into.

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
  items?: RawInventoryItem[];
  products?: RawInventoryItem[];
}

export interface RawInventoryDetailProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface RawInventoryDetail {
  id: string;
  name: string;
  address?: string;
  products: RawInventoryDetailProduct[];
}
