import type {
  PurchaseDetail,
  PurchasePaymentStatus,
  PurchaseStatus,
} from "@/types/purchases";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyEquals(left: number, right: number): boolean {
  return roundMoney(left) === roundMoney(right);
}

export function purchaseItemsTotal(
  items: ReadonlyArray<{ quantity: number; unitPrice: number }>,
): number {
  return roundMoney(
    items.reduce(
      (total, item) => total + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    ),
  );
}

export function paidPurchaseAmount(
  purchase: Pick<PurchaseDetail, "totalPrice" | "remainingBalance">,
): number {
  return roundMoney(purchase.totalPrice - purchase.remainingBalance);
}

export function paymentStatusForInstallment(
  amount: number,
  remainingBalance: number,
): Exclude<PurchasePaymentStatus, "unpaid"> {
  return moneyEquals(amount, remainingBalance)
    ? "fully_paid"
    : "partially_paid";
}

export function canAddPurchasePayment(
  purchase: Pick<
    PurchaseDetail,
    "status" | "paymentStatus" | "remainingBalance"
  >,
): boolean {
  return (
    purchase.status !== "Cancelled" &&
    purchase.paymentStatus !== "fully_paid" &&
    roundMoney(purchase.remainingBalance) > 0
  );
}

export function canUpdatePurchaseStatus(status: PurchaseStatus): boolean {
  return status === "Draft";
}

export function formatPurchaseDate(value?: string): string {
  if (!value) return "—";

  const normalized = value.includes("T") ? value : `${value}T12:00:00Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatPurchaseDateTime(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
