// src/utils/format.ts

/**
 * Formats a number with commas for thousands and a dot for decimals.
 * @param value - The number or numeric string to format
 * @param decimals - Number of decimal places to force (defaults to 2)
 */
export const formatNumber = (
  value: number | string,
  decimals: number = 2,
): string => {
  const num = typeof value === "string" ? parseFloat(value) : value;

  // Handle invalid numbers or empty API responses safely
  if (isNaN(num)) return "0.00";

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
};
