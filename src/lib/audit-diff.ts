export interface FieldDiff {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export function getChangedFields(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): FieldDiff[] {
  const keys = new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);

  const diffs: FieldDiff[] = [];
  keys.forEach((field) => {
    const oldValue = before?.[field];
    const newValue = after?.[field];
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      diffs.push({ field, oldValue, newValue });
    }
  });
  return diffs;
}

export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
