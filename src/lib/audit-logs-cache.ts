import { mutate } from "swr";

export function invalidateAuditLogs(entityId?: string) {
  mutate(
    (key) =>
      Array.isArray(key) &&
      typeof key[0] === "string" &&
      (entityId
        ? key[0] === `/audit/entity/${entityId}`
        : key[0].startsWith("/audit")),
    undefined,
    { revalidate: true },
  );
}
