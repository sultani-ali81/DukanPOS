import { formatCurrency } from "@/lib/currency";
import type {
  AiAssistantGraph,
  AiAssistantGraphValueFormat,
} from "@/types/ai-assistant";

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

function escapeCsvField(value: number | string | undefined) {
  if (value === undefined) return "";

  const text = String(value);
  // Spreadsheet applications can interpret leading formula characters. Chart
  // labels and series names come from the server, so keep exported CSV safe.
  const safeText =
    typeof value === "string" && /^[=+\-@]/.test(text) ? `'${text}` : text;

  return /[",\r\n]/.test(safeText)
    ? `"${safeText.replaceAll('"', '""')}"`
    : safeText;
}

/** Creates a spreadsheet-friendly export of the chart data currently shown. */
export function createAiAssistantChartCsv(graph: AiAssistantGraph) {
  const rowCount = Math.max(
    graph.labels.length,
    ...graph.datasets.map((dataset) => dataset.data.length),
    0,
  );
  const rows = Array.from({ length: rowCount }, (_, rowIndex) => [
    graph.labels[rowIndex] ?? "",
    ...graph.datasets.map((dataset) => {
      const value = dataset.data[rowIndex];
      return typeof value === "number" && Number.isFinite(value)
        ? value
        : undefined;
    }),
  ]);
  const headers = [
    graph.xAxisLabel || "Label",
    ...graph.datasets.map((dataset) => dataset.label),
  ];

  return [headers, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\r\n");
}
