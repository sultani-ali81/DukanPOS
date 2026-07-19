import { cn } from "@/lib/utils";
import type {
  AiAssistantGraph,
  AiAssistantGraphValueFormat,
} from "@/types/ai-assistant";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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
  getAiAssistantPieSliceColor,
} from "../ai-assistant-chart.utils";
import { useState } from "react";

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

type PieSliceSelection = {
  datasetIndex: number;
  sliceIndex: number;
};

type PieSliceDetails = PieSliceSelection & {
  datasetLabel: string;
  label: string;
  percentage?: number;
  value: number;
};

const chartMargins = { top: 8, right: 12, bottom: 8, left: 0 };
const piePercentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

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

function getDatasetTotal(dataset: AiAssistantGraph["datasets"][number]) {
  const values = dataset.data.filter(Number.isFinite);
  if (!values.length) return undefined;

  return values.reduce((total, value) => total + value, 0);
}

function getPieTotal(data: PieChartRow[]) {
  const values = data
    .map((slice) => slice.value)
    .filter(
      (value): value is number =>
        typeof value === "number" && Number.isFinite(value) && value >= 0,
    );

  if (!values.length) return undefined;

  return values.reduce((total, value) => total + value, 0);
}

function formatPiePercentage(percentage: number | undefined) {
  return typeof percentage === "number"
    ? `${piePercentFormatter.format(percentage)}%`
    : undefined;
}

function isSamePieSlice(
  first: PieSliceSelection | null,
  second: PieSliceSelection,
) {
  return (
    first?.datasetIndex === second.datasetIndex &&
    first.sliceIndex === second.sliceIndex
  );
}

function getPieSliceDetails(
  graph: AiAssistantGraph,
  selection: PieSliceSelection | null,
): PieSliceDetails | null {
  if (!selection) return null;

  const dataset = graph.datasets[selection.datasetIndex];
  if (!dataset) return null;

  const data = buildPieData(graph, selection.datasetIndex);
  const slice = data[selection.sliceIndex];
  if (!slice || typeof slice.value !== "number") return null;

  const total = getPieTotal(data);
  const percentage =
    typeof total === "number" && total > 0 && slice.value >= 0
      ? (slice.value / total) * 100
      : undefined;

  return {
    ...selection,
    datasetLabel: dataset.label,
    label: slice.label || `Item ${selection.sliceIndex + 1}`,
    percentage,
    value: slice.value,
  };
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

type PieAssistantChartProps = {
  activeSlice: PieSliceSelection | null;
  graph: AiAssistantGraph;
  onHoverSlice: (selection: PieSliceSelection) => void;
  onLeaveSlices: () => void;
  onSelectSlice: (selection: PieSliceSelection) => void;
};

function getPieSliceOpacity(
  activeSlice: PieSliceSelection | null,
  datasetIndex: number,
  sliceIndex: number,
) {
  if (!activeSlice) return 1;
  if (activeSlice.datasetIndex !== datasetIndex) return 0.62;

  return activeSlice.sliceIndex === sliceIndex ? 1 : 0.48;
}

function PieAssistantChart({
  activeSlice,
  graph,
  onHoverSlice,
  onLeaveSlices,
  onSelectSlice,
}: PieAssistantChartProps) {
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
        const data = buildPieData(graph, index);
        const hasMultipleSlices = data.length > 1;

        return (
          <Pie
            key={`${dataset.label}-${index}`}
            data={data}
            dataKey="value"
            nameKey="label"
            fill={color}
            stroke="hsl(var(--card))"
            strokeWidth={1}
            paddingAngle={hasMultipleSlices ? 1.5 : 0}
            cornerRadius={graph.type === "doughnut" ? 5 : 3}
            innerRadius={radius.innerRadius}
            outerRadius={radius.outerRadius}
            onMouseEnter={(_, sliceIndex) =>
              onHoverSlice({ datasetIndex: index, sliceIndex })
            }
            onMouseLeave={onLeaveSlices}
            onClick={(_, sliceIndex) =>
              onSelectSlice({ datasetIndex: index, sliceIndex })
            }
            isAnimationActive={false}
          >
            {data.map((_, sliceIndex) => {
              const isActive = isSamePieSlice(activeSlice, {
                datasetIndex: index,
                sliceIndex,
              });

              return (
                <Cell
                  key={`${dataset.label}-${index}-${sliceIndex}`}
                  fill={getAiAssistantPieSliceColor(
                    dataset.color,
                    index,
                    sliceIndex,
                    data.length,
                  )}
                  cursor="pointer"
                  opacity={getPieSliceOpacity(activeSlice, index, sliceIndex)}
                  stroke="hsl(var(--card))"
                  strokeWidth={isActive ? 1.5 : 1}
                />
              );
            })}
          </Pie>
        );
      })}
    </PieChart>
  );
}

type PieChartLegendProps = {
  activeSlice: PieSliceSelection | null;
  graph: AiAssistantGraph;
  onHoverSlice: (selection: PieSliceSelection) => void;
  onLeaveSlices: () => void;
  onSelectSlice: (selection: PieSliceSelection) => void;
  selectedSlice: PieSliceSelection | null;
};

function PieChartLegend({
  activeSlice,
  graph,
  onHoverSlice,
  onLeaveSlices,
  onSelectSlice,
  selectedSlice,
}: PieChartLegendProps) {
  if (!graph.datasets.length) return null;

  return (
    <div
      className="mt-3 grid gap-2 text-xs text-muted-foreground"
      data-testid="chart-slice-legend"
    >
      {graph.datasets.map((dataset, datasetIndex) => {
        const data = buildPieData(graph, datasetIndex);
        const total = getPieTotal(data);
        const showDatasetLabel = graph.datasets.length > 1;

        return (
          <div
            key={`${dataset.label}-${datasetIndex}`}
            className={cn(
              "min-w-0",
              datasetIndex > 0 && "border-t border-border/40 pt-2",
            )}
          >
            {showDatasetLabel ? (
              <p className="mb-1.5 flex min-w-0 items-center gap-1.5 font-medium text-foreground">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor: getAiAssistantChartColor(
                      dataset.color,
                      datasetIndex,
                    ),
                  }}
                  aria-hidden="true"
                />
                <span className="truncate">{dataset.label}</span>
                {typeof total === "number" ? (
                  <span className="ml-auto shrink-0 font-normal text-muted-foreground">
                    {formatAiAssistantChartValue(total, graph.valueFormat)}
                  </span>
                ) : null}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-1">
              {data.map((slice, sliceIndex) => {
                const selection = { datasetIndex, sliceIndex };
                const details = getPieSliceDetails(graph, selection);
                const label = details?.label || `Item ${sliceIndex + 1}`;
                const value =
                  typeof slice.value === "number"
                    ? formatAiAssistantChartValue(
                        slice.value,
                        graph.valueFormat,
                      )
                    : "No value";
                const percentage = formatPiePercentage(details?.percentage);
                const isActive = isSamePieSlice(activeSlice, selection);
                const isSelected = isSamePieSlice(selectedSlice, selection);
                const color = getAiAssistantPieSliceColor(
                  dataset.color,
                  datasetIndex,
                  sliceIndex,
                  data.length,
                );

                return (
                  <button
                    key={`${label}-${sliceIndex}`}
                    type="button"
                    className={cn(
                      "inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1 text-left transition-colors",
                      "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      isActive && "bg-muted text-foreground",
                    )}
                    aria-label={`Show ${label}: ${value}${percentage ? ` (${percentage})` : ""}`}
                    aria-pressed={isSelected}
                    onBlur={onLeaveSlices}
                    onClick={() => onSelectSlice(selection)}
                    onFocus={() => onHoverSlice(selection)}
                    onMouseEnter={() => onHoverSlice(selection)}
                    onMouseLeave={onLeaveSlices}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: color }}
                      aria-hidden="true"
                    />
                    <span className="max-w-28 truncate">{label}</span>
                    <span className="shrink-0 text-foreground">{value}</span>
                    {percentage ? (
                      <span className="shrink-0 text-muted-foreground">
                        {percentage}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
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
        const total = getDatasetTotal(dataset);

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
            {typeof total === "number" ? (
              <span className="shrink-0 text-foreground">
                {formatAiAssistantChartValue(total, graph.valueFormat)}
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

function PieSelectionSummary({
  details,
  graph,
}: {
  details: PieSliceDetails | null;
  graph: AiAssistantGraph;
}) {
  if (!details) {
    return (
      <p
        className="mt-2 text-center text-xs text-muted-foreground"
        data-testid="circular-chart-selection"
        aria-live="polite"
      >
        Hover or select a slice to inspect its value and share.
      </p>
    );
  }

  const percentage = formatPiePercentage(details.percentage);

  return (
    <p
      className="mt-2 text-center text-xs text-muted-foreground"
      data-testid="circular-chart-selection"
      aria-live="polite"
    >
      {graph.datasets.length > 1 ? `${details.datasetLabel}: ` : ""}
      <span className="font-medium text-foreground">{details.label}</span>
      <span className="ml-1.5 font-medium text-foreground">
        {formatAiAssistantChartValue(details.value, graph.valueFormat)}
      </span>
      {percentage ? <span className="ml-1">{percentage}</span> : null}
    </p>
  );
}

function DoughnutCenter({
  details,
  graph,
}: {
  details: PieSliceDetails | null;
  graph: AiAssistantGraph;
}) {
  const firstDataset = graph.datasets[0];
  const firstDatasetTotal = firstDataset
    ? getPieTotal(buildPieData(graph, 0))
    : undefined;
  const percentage = formatPiePercentage(details?.percentage);
  const value = details
    ? formatAiAssistantChartValue(details.value, graph.valueFormat)
    : typeof firstDatasetTotal === "number"
      ? formatAiAssistantChartValue(firstDatasetTotal, graph.valueFormat)
      : "—";
  const label = details?.label || (firstDataset ? "Total" : "Select a slice");
  const context = details
    ? [
        graph.datasets.length > 1 ? details.datasetLabel : undefined,
        percentage,
      ]
        .filter(Boolean)
        .join(" · ")
    : firstDataset && graph.datasets.length === 1
      ? firstDataset.label
      : "";

  return (
    <div
      className="pointer-events-none absolute inset-0 flex items-center justify-center px-16 text-center"
      data-testid="doughnut-center-summary"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="line-clamp-2 text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground sm:text-base">
          {value}
        </p>
        {context ? (
          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
            {context}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function CircularChartFrame({ graph }: { graph: AiAssistantGraph }) {
  const [hoveredSlice, setHoveredSlice] = useState<PieSliceSelection | null>(
    null,
  );
  const [selectedSlice, setSelectedSlice] = useState<PieSliceSelection | null>(
    null,
  );
  const activeSlice = getPieSliceDetails(graph, hoveredSlice)
    ? hoveredSlice
    : getPieSliceDetails(graph, selectedSlice)
      ? selectedSlice
      : null;
  const activeDetails = getPieSliceDetails(graph, activeSlice);

  function selectSlice(selection: PieSliceSelection) {
    setSelectedSlice((current) =>
      isSamePieSlice(current, selection) ? null : selection,
    );
  }

  return (
    <>
      <div className="relative mt-3 h-64 min-w-0 sm:h-80">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <PieAssistantChart
            activeSlice={activeSlice}
            graph={graph}
            onHoverSlice={setHoveredSlice}
            onLeaveSlices={() => setHoveredSlice(null)}
            onSelectSlice={selectSlice}
          />
        </ResponsiveContainer>
        {graph.type === "doughnut" && graph.datasets.length === 1 ? (
          <DoughnutCenter details={activeDetails} graph={graph} />
        ) : null}
      </div>
      {graph.type === "pie" || graph.datasets.length > 1 ? (
        <PieSelectionSummary details={activeDetails} graph={graph} />
      ) : null}
      <PieChartLegend
        activeSlice={activeSlice}
        graph={graph}
        onHoverSlice={setHoveredSlice}
        onLeaveSlices={() => setHoveredSlice(null)}
        onSelectSlice={selectSlice}
        selectedSlice={selectedSlice}
      />
    </>
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
  const isCircularChart = graph.type === "pie" || graph.type === "doughnut";

  return (
    <figure
      className={cn(
        "mt-4 min-w-0 border-t pt-4",
        isCircularChart ? "border-border/40" : "border-border/70",
        className,
      )}
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
          {isCircularChart ? (
            <CircularChartFrame graph={graph} />
          ) : (
            <CartesianChartFrame graph={graph} />
          )}
          {isCircularChart ? null : <ChartLegend graph={graph} />}
        </>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          No chart data available.
        </p>
      )}
    </figure>
  );
}
