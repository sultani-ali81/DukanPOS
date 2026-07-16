import { formatCurrency } from "@/lib/currency";
import type { AiAssistantGraphValueFormat } from "@/types/ai-assistant";

export const AI_ASSISTANT_CHART_PALETTE = [
  "#2563eb",
  "#16a34a",
  "#d97706",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
  "#db2777",
  "#4f46e5",
] as const;

/**
 * Keeps the same dataset position on the same color across renders when the
 * backend does not send a color. A backend-provided color always wins.
 */
export function getAiAssistantChartColor(
  color: string | undefined,
  datasetIndex: number,
) {
  if (color) return color;

  return AI_ASSISTANT_CHART_PALETTE[
    datasetIndex % AI_ASSISTANT_CHART_PALETTE.length
  ];
}

export function formatAiAssistantChartValue(
  value: number,
  valueFormat: AiAssistantGraphValueFormat,
) {
  if (!Number.isFinite(value)) return "Not available";
  if (valueFormat === "currency") return formatCurrency(value);

  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 20,
  }).format(value);
}
