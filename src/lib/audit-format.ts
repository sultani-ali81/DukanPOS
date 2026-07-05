export function formatAuditRecord(
  record: Record<string, unknown> | null,
): string {
  if (!record || Object.keys(record).length === 0) return "—";

  return Object.entries(record)
    .map(([key, value]) => `${key}: ${formatValue(value)}`)
    .join(", ");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
