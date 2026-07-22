import type { PaginationMeta } from "@/hooks/use-pagination";
import { AuditActionType, AuditEntityType } from "./audit-enmus";

export { AuditActionType, AuditEntityType };

export interface AuditEmployee {
  id: string;
  name: string;
  email?: string; // only present when the log came from GET /audit
}

export interface StockMovementItem {
  id: string;
  quantity: number;
  product: { id: string; name: string };
}

export interface StockInDetails {
  id: string;
  status: string;
  createdAt: string;
  inventory: { id: string; name: string } | null;
  purchase: { id: string } | null;
  sequence: { prefix: string; lastIndex: number } | null;
  items: StockMovementItem[];
}

export interface StockOutDetails {
  id: string;
  status: string;
  createdAt: string;
  inventory: { id: string; name: string } | null;
  sale: { id: string; status: string } | null;
  sequence: { prefix: string; lastIndex: number } | null;
  items: StockMovementItem[];
}

export interface StockMovementDetails {
  id: string;
  status: string;
  sourceInventory: { id: string; name: string };
  destinationInventory: { id: string; name: string };
  products: { id: string; name: string; quantity: number }[];
}

// Normalized shape used everywhere in the frontend, regardless of which
// endpoint (/audit or /audit/entity/:id) the log came from.
export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string | null;
  actionType: AuditActionType | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  employee: AuditEmployee;
  stockIn?: StockInDetails | null;
  stockOut?: StockOutDetails | null;
  stockMovement?: StockMovementDetails | null;
}

export interface AuditResponse {
  data: AuditLog[];
  meta: PaginationMeta;
}

export interface UseAuditLogsParams {
  type?: AuditEntityType;
  page?: number;
  itemsPerPage?: number;
}
