import type { PaginationMeta } from "@/hooks/use-pagination";
import { AuditActionType, AuditEntityType } from "./audit-enmus";

export { AuditActionType, AuditEntityType };

export interface AuditEmployee {
  id: string;
  name: string;
  email: string;
}

export interface AuditLog {
  id: string;
  entityType: AuditEntityType;
  entityId: string;
  actionType: AuditActionType;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  employee: AuditEmployee;
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
