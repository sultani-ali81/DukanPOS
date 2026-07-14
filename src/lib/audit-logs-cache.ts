export function createAuditLogsMatcher(entityId?: string) {
  return (key: unknown): boolean =>
    Array.isArray(key) &&
    typeof key[0] === "string" &&
    (key[0] === "/audit" ||
      (!!entityId && key[0] === `/audit/entity/${entityId}`));
}
