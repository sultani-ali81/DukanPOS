export const CURRENCY = "AFN ";

export function formatCurrency(amount: number | null): string {
  const value = amount || 0;

  return `${CURRENCY}${value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
