import type {
  AuditEmployee,
  AuditLog,
  StockInDetails,
  StockMovementDetails,
  StockOutDetails,
} from "@/types/audit";

// Raw shape as it actually comes off the wire — either endpoint's response.
export interface RawAuditLog {
  id: string;
  entityType: AuditLog["entityType"];
  entityId: string | null;
  actionType: AuditLog["actionType"];
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  employee?: { id: string; name: string; email: string }; // from GET /audit
  performedBy?: { id: string; name: string }; // from GET /audit/entity/:id
  stockIn?: StockInDetails | null;
  stockOut?: StockOutDetails | null;
  stockMovement?: StockMovementDetails | null;
}

export function normalizeAuditLog(raw: RawAuditLog): AuditLog {
  const source = raw.employee ?? raw.performedBy;

  const employee: AuditEmployee = {
    id: source?.id ?? "",
    name: source?.name ?? "Unknown",
    email: raw.employee?.email,
  };

  return {
    id: raw.id,
    entityType: raw.entityType,
    entityId: raw.entityId,
    actionType: raw.actionType,
    before: raw.before,
    after: raw.after,
    createdAt: raw.createdAt,
    employee,
    stockIn: raw.stockIn ?? null,
    stockOut: raw.stockOut ?? null,
    stockMovement: raw.stockMovement ?? null,
  };
}
