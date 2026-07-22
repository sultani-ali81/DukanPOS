import { AuditActionType, AuditEntityType } from "@/types/audit";

export const actionBadgeVariant: Record<
  AuditActionType,
  "default" | "secondary" | "destructive" | "outline"
> = {
  [AuditActionType.Create]: "default",
  [AuditActionType.Update]: "secondary",
  [AuditActionType.Delete]: "destructive",
  [AuditActionType.Open]: "outline",
  [AuditActionType.Close]: "outline",
};

export const actionLabel: Record<AuditActionType, string> = {
  [AuditActionType.Create]: "Created",
  [AuditActionType.Update]: "Updated",
  [AuditActionType.Delete]: "Deleted",
  [AuditActionType.Open]: "Opened",
  [AuditActionType.Close]: "Closed",
};

export const entityLabel: Record<AuditEntityType, string> = {
  [AuditEntityType.Sale]: "Sale",
  [AuditEntityType.Purchase]: "Purchase",
  [AuditEntityType.StockIn]: "Stock In",
  [AuditEntityType.StockOut]: "Stock Out",
  [AuditEntityType.StockMovement]: "Stock Movement",
  [AuditEntityType.JournalEntry]: "Journal Entry",
  [AuditEntityType.Category]: "Category",
  [AuditEntityType.Product]: "Product",
  [AuditEntityType.Customer]: "Customer",
  [AuditEntityType.Inventory]: "Inventory",
  [AuditEntityType.Store]: "Store",
  [AuditEntityType.Employee]: "Employee",
  [AuditEntityType.Payment]: "Payment",
  [AuditEntityType.StoreSession]: "Store Session",
  [AuditEntityType.CashMovement]: "Cash Movement",
};
