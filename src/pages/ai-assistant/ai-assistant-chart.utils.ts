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
  "#65a30d",
  "#ea580c",
  "#0f766e",
  "#a21caf",
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

/**
 * Circular charts represent labels as individual sectors, so a dataset color
 * cannot distinguish their categories. Keep one color only for a one-sector
 * chart; otherwise assign stable, distinct colors by sector position.
 */
export function getAiAssistantPieSliceColor(
  datasetColor: string | undefined,
  datasetIndex: number,
  sliceIndex: number,
  sliceCount: number,
) {
  if (sliceCount <= 1) {
    return getAiAssistantChartColor(datasetColor, datasetIndex);
  }

  if (sliceIndex < AI_ASSISTANT_CHART_PALETTE.length) {
    return AI_ASSISTANT_CHART_PALETTE[sliceIndex];
  }

  // Golden-angle spacing keeps additional sectors visually separated instead
  // of repeating a palette color on charts with many categories.
  const hue = Math.round((sliceIndex * 137.508) % 360);
  return `hsl(${hue} 68% 46%)`;
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
