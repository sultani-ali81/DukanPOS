import {
  AUDIT_LOGS_BY_ENTITY_KEY,
  AUDIT_LOGS_KEY,
  auditLogsFetcher,
} from "@/queries/audit-logs";
import { extractError } from "@/lib/error";
import type { AuditEntityType, AuditLog } from "@/types/audit";
import useSWR from "swr";

interface UseAuditLogsOptions {
  entityId?: string; // if provided, hits /audit/entity/:entityId
  type?: AuditEntityType;
  page?: number;
  itemsPerPage?: number;
}

export function useAuditLogs({
  entityId,
  type,
  page,
  itemsPerPage,
}: UseAuditLogsOptions = {}) {
  const key = entityId
    ? AUDIT_LOGS_BY_ENTITY_KEY(entityId, { page, itemsPerPage })
    : AUDIT_LOGS_KEY({ type, page, itemsPerPage });

  const { data, error, isLoading, mutate } = useSWR(key, auditLogsFetcher);

  const logs: AuditLog[] = data?.data ?? [];
  const meta = data?.meta;

  return {
    logs,
    meta,
    isLoading,
    error: error ? extractError(error, "Failed to load logs") : null,
    mutate,
  };
}
