import api from "@/lib/axios";
import type { AuditResponse, UseAuditLogsParams } from "@/types/audit";

export const auditLogsFetcher = ([url, params]: [string, UseAuditLogsParams]) =>
  api.get<AuditResponse>(url, { params }).then((res) => res.data);

export const AUDIT_LOGS_KEY = (params: UseAuditLogsParams = {}) =>
  ["/audit", params] as const;

export const AUDIT_LOGS_BY_ENTITY_KEY = (
  entityId: string,
  params: Pick<UseAuditLogsParams, "page" | "itemsPerPage"> = {},
) => [`/audit/entity/${entityId}`, params] as const;
