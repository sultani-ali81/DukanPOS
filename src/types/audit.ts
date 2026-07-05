import type { PaginationMeta } from "@/hooks/use-pagination"; // adjust if your existing file uses a different name
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
  entityId: string | null;
  actionType: AuditActionType | null;
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
