import { normalizeAuditLog } from "@/lib/audit-normalize";
import api from "@/lib/axios";
import type { AuditResponse, UseAuditLogsParams } from "@/types/audit";

export const auditLogsFetcher = async ([url, params]: [
  string,
  UseAuditLogsParams,
]) => {
  const res = await api.get(url, { params });
  return {
    data: res.data.data.map(normalizeAuditLog),
    meta: res.data.meta,
  } as AuditResponse;
};

export const AUDIT_LOGS_KEY = (params: UseAuditLogsParams = {}) =>
  ["/audit", params] as const;

export const AUDIT_LOGS_BY_ENTITY_KEY = (
  entityId: string,
  params: Pick<UseAuditLogsParams, "page" | "itemsPerPage"> = {},
) => [`/audit/entity/${entityId}`, params] as const;
