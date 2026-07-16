import type {
  AiAssistantGraph,
  AiAssistantGraphType,
  AiAssistantGraphValueFormat,
} from "@/types/ai-assistant";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGraphType(value: unknown): value is AiAssistantGraphType {
  return (
    value === "line" ||
    value === "bar" ||
    value === "pie" ||
    value === "doughnut"
  );
}

function isGraphValueFormat(
  value: unknown,
): value is AiAssistantGraphValueFormat {
  return value === "currency" || value === "number";
}

/**
 * Validates graph data received from either the live SSE stream or persisted
 * assistant-message metadata before it reaches the chart renderer.
 */
export function parseAiAssistantGraph(
  value: unknown,
): AiAssistantGraph | null {
  if (!isRecord(value)) return null;
  if (!isGraphType(value.type)) return null;
  if (typeof value.title !== "string") return null;
  if (typeof value.xAxisLabel !== "string") return null;
  if (typeof value.yAxisLabel !== "string") return null;
  if (!isGraphValueFormat(value.valueFormat)) return null;
  if (!Array.isArray(value.labels)) return null;
  if (!value.labels.every((label) => typeof label === "string")) return null;
  if (!Array.isArray(value.datasets)) return null;

  const datasets: AiAssistantGraph["datasets"] = [];
  for (const dataset of value.datasets) {
    if (!isRecord(dataset)) return null;
    if (typeof dataset.label !== "string") return null;
    if (dataset.color !== undefined && typeof dataset.color !== "string") {
      return null;
    }
    if (!Array.isArray(dataset.data)) return null;
    if (!dataset.data.every((item) => typeof item === "number")) return null;

    datasets.push({
      label: dataset.label,
      data: dataset.data,
      ...(typeof dataset.color === "string" ? { color: dataset.color } : {}),
    });
  }

  return {
    type: value.type,
    title: value.title,
    xAxisLabel: value.xAxisLabel,
    yAxisLabel: value.yAxisLabel,
    valueFormat: value.valueFormat,
    labels: value.labels,
    datasets,
  };
}
