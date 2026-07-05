export const AuditActionType = {
  Create: "create",
  Update: "update",
  Delete: "delete",
  Open: "open",
  Close: "close",
} as const;

export type AuditActionType =
  (typeof AuditActionType)[keyof typeof AuditActionType];

export const AuditEntityType = {
  Sale: "sale",
  Purchase: "purchase",
  StockIn: "stock_in",
  StockOut: "stock_out",
  JournalEntry: "journal_entry",
  Category: "category",
  Product: "product",
  Customer: "customer",
  Inventory: "inventory",
  Store: "store",
  Employee: "employee",
  Payment: "payment",
  StoreSession: "store_session",
  CashMovement: "cash_movement",
} as const;

export type AuditEntityType =
  (typeof AuditEntityType)[keyof typeof AuditEntityType];
