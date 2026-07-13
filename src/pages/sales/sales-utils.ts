import type { SaleDetail } from "@/types/sale";

export function formatSaleDateTime(value?: string): string {
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

export function canCollectSalePayment(
  sale: Pick<
    SaleDetail,
    "status" | "paymentStatus" | "remainingBalance"
  >,
): boolean {
  return (
    sale.status !== "Cancelled" &&
    sale.paymentStatus !== "fully_paid" &&
    sale.remainingBalance > 0
  );
}

export function responseStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  return typeof response?.status === "number" ? response.status : undefined;
}
