import { cn } from "@/lib/utils";
import type {
  AiAssistantGraph,
  AiAssistantGraphValueFormat,
} from "@/types/ai-assistant";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  formatAiAssistantChartValue,
  getAiAssistantChartColor,
} from "../ai-assistant-chart.utils";

type AiAssistantChartProps = {
  graph: AiAssistantGraph;
  className?: string;
};

type CartesianChartRow = {
  label?: string;
  [key: string]: number | string | undefined;
};

type PieChartRow = {
  label?: string;
  value?: number;
};

const chartMargins = { top: 8, right: 12, bottom: 8, left: 0 };

function formatTooltipValue(
  value: unknown,
  valueFormat: AiAssistantGraphValueFormat,
) {
  return typeof value === "number"
    ? formatAiAssistantChartValue(value, valueFormat)
    : "Not available";
}

function getRenderableValue(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function getMaxDataLength(graph: AiAssistantGraph) {
  return Math.max(
    graph.labels.length,
    ...graph.datasets.map((dataset) => dataset.data.length),
    0,
  );
}

function buildCartesianData(graph: AiAssistantGraph): CartesianChartRow[] {
  const rowCount = getMaxDataLength(graph);

  return Array.from({ length: rowCount }, (_, rowIndex) => {
    const row: CartesianChartRow = {
      label: graph.labels[rowIndex],
    };

    graph.datasets.forEach((dataset, datasetIndex) => {
      row[`dataset-${datasetIndex}`] = getRenderableValue(
        dataset.data[rowIndex],
      );
    });

    return row;
  });
}

function buildPieData(
  graph: AiAssistantGraph,
  datasetIndex: number,
): PieChartRow[] {
  const dataset = graph.datasets[datasetIndex];
  const rowCount = Math.max(graph.labels.length, dataset?.data.length ?? 0);

  return Array.from({ length: rowCount }, (_, rowIndex) => ({
    label: graph.labels[rowIndex],
    value: getRenderableValue(dataset?.data[rowIndex]),
  }));
}

function hasRenderableValues(graph: AiAssistantGraph) {
  return graph.datasets.some((dataset) =>
    dataset.data.some((value) => Number.isFinite(value)),
  );
}

function getPieRadius(
  graphType: AiAssistantGraph["type"],
  datasetIndex: number,
  datasetCount: number,
) {
  if (datasetCount <= 1) {
    return {
      innerRadius: graphType === "doughnut" ? "52%" : "0%",
      outerRadius: "86%",
    };
  }

  const baseInner = graphType === "doughnut" ? 30 : 8;
  const usableRadius = 86 - baseInner;
  const ringWidth = usableRadius / datasetCount;
  const innerRadius = baseInner + datasetIndex * ringWidth;
  const outerRadius = innerRadius + ringWidth - 2;

  return {
    innerRadius: `${Math.max(0, innerRadius)}%`,
    outerRadius: `${Math.max(innerRadius, outerRadius)}%`,
  };
}

function ChartDataTable({ graph }: { graph: AiAssistantGraph }) {
  const rowCount = getMaxDataLength(graph);

  return (
    <table className="sr-only">
      <caption>{graph.title ? `${graph.title} chart data` : "Chart data"}</caption>
      <thead>
        <tr>
          <th scope="col">{graph.xAxisLabel || "Label"}</th>
          {graph.datasets.map((dataset, index) => (
            <th key={`${dataset.label}-${index}`} scope="col">
              {dataset.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: rowCount }, (_, rowIndex) => (
          <tr key={rowIndex}>
            <th scope="row">{graph.labels[rowIndex] ?? ""}</th>
            {graph.datasets.map((dataset, datasetIndex) => {
              const value = getRenderableValue(dataset.data[rowIndex]);

              return (
                <td key={`${dataset.label}-${datasetIndex}`}>
                  {typeof value === "number"
                    ? formatAiAssistantChartValue(value, graph.valueFormat)
                    : "No value"}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CartesianAssistantChart({ graph }: { graph: AiAssistantGraph }) {
  const data = buildCartesianData(graph);
  const chartChildren = (
    <>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis
        dataKey="label"
        height={32}
        minTickGap={16}
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 12 }}
      />
      <YAxis
        width={88}
        tickLine={false}
        axisLine={false}
        tick={{ fontSize: 12 }}
        tickMargin={8}
        tickFormatter={(value) =>
          typeof value === "number"
            ? formatAiAssistantChartValue(value, graph.valueFormat)
            : String(value)
        }
      />
      <Tooltip
        formatter={(value) => formatTooltipValue(value, graph.valueFormat)}
        labelFormatter={(value) => String(value)}
        contentStyle={{
          borderRadius: 8,
          borderColor: "hsl(var(--border))",
          fontSize: 12,
        }}
      />
      {graph.datasets.map((dataset, index) => {
        const color = getAiAssistantChartColor(dataset.color, index);

        return graph.type === "line" ? (
          <Line
            key={`${dataset.label}-${index}`}
            type="monotone"
            dataKey={`dataset-${index}`}
            name={dataset.label}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, stroke: color }}
            activeDot={{ r: 5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        ) : (
          <Bar
            key={`${dataset.label}-${index}`}
            dataKey={`dataset-${index}`}
            name={dataset.label}
            fill={color}
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        );
      })}
    </>
  );

  if (graph.type === "line") {
    return (
      <LineChart data={data} margin={chartMargins} accessibilityLayer>
        {chartChildren}
      </LineChart>
    );
  }

  return (
    <BarChart data={data} margin={chartMargins} accessibilityLayer>
      {chartChildren}
    </BarChart>
  );
}

function PieAssistantChart({ graph }: { graph: AiAssistantGraph }) {
  return (
    <PieChart margin={{ top: 12, right: 16, bottom: 12, left: 16 }}>
      <Tooltip
        formatter={(value) => formatTooltipValue(value, graph.valueFormat)}
        labelFormatter={(value) => String(value)}
        contentStyle={{
          borderRadius: 8,
          borderColor: "hsl(var(--border))",
          fontSize: 12,
        }}
      />
      {graph.datasets.map((dataset, index) => {
        const radius = getPieRadius(graph.type, index, graph.datasets.length);
        const color = getAiAssistantChartColor(dataset.color, index);

        return (
          <Pie
            key={`${dataset.label}-${index}`}
            data={buildPieData(graph, index)}
            dataKey="value"
            nameKey="label"
            fill={color}
            stroke="hsl(var(--background))"
            innerRadius={radius.innerRadius}
            outerRadius={radius.outerRadius}
            isAnimationActive={false}
          />
        );
      })}
    </PieChart>
  );
}

function ChartLegend({ graph }: { graph: AiAssistantGraph }) {
  if (!graph.datasets.length) return null;

  return (
    <div
      className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground"
      data-testid="chart-series-legend"
    >
      {graph.datasets.map((dataset, index) => {
        const color = getAiAssistantChartColor(dataset.color, index);

        return (
          <span
            key={`${dataset.label}-${index}`}
            className="inline-flex min-w-0 items-center gap-1.5"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="truncate">{dataset.label}</span>
          </span>
        );
      })}
    </div>
  );
}

function CartesianChartFrame({ graph }: { graph: AiAssistantGraph }) {
  return (
    <div className="mt-3 flex min-w-0">
      <div className="flex w-7 shrink-0 items-center justify-center pb-7 pr-1 text-xs text-muted-foreground sm:w-8">
        {graph.yAxisLabel ? (
          <span
            className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap"
            data-testid="chart-y-axis-label"
          >
            {graph.yAxisLabel}
          </span>
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="h-64 min-w-0 sm:h-80">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <CartesianAssistantChart graph={graph} />
          </ResponsiveContainer>
        </div>
        {graph.xAxisLabel ? (
          <p
            className="pt-2 text-center text-xs text-muted-foreground"
            data-testid="chart-x-axis-label"
          >
            {graph.xAxisLabel}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function AiAssistantChart({
  graph,
  className,
}: AiAssistantChartProps) {
  const hasValues = hasRenderableValues(graph);
  const chartLabel = graph.title || "Business chart";

  return (
    <figure
      className={cn("mt-4 min-w-0 border-t border-border/70 pt-4", className)}
      aria-label={chartLabel}
      data-testid="ai-assistant-chart"
      data-chart-type={graph.type}
    >
      {graph.title ? (
        <h3 className="text-sm font-semibold text-foreground">
          {graph.title}
        </h3>
      ) : null}
      <figcaption className="sr-only">
        {graph.title}
        {graph.xAxisLabel ? ` ${graph.xAxisLabel}.` : ""}
        {graph.yAxisLabel ? ` ${graph.yAxisLabel}.` : ""}
      </figcaption>
      <ChartDataTable graph={graph} />

      {hasValues ? (
        <>
          {graph.type === "pie" || graph.type === "doughnut" ? (
            <div className="mt-3 h-64 min-w-0 sm:h-80">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieAssistantChart graph={graph} />
              </ResponsiveContainer>
            </div>
          ) : (
            <CartesianChartFrame graph={graph} />
          )}
          <ChartLegend graph={graph} />
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No chart data available.
        </p>
      )}
    </figure>
  );
}
