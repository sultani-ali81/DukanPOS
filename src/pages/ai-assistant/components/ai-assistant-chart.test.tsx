import type { AiAssistantGraph } from "@/types/ai-assistant";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { formatAiAssistantChartValue } from "../ai-assistant-chart.utils";
import { AiAssistantChart } from "./ai-assistant-chart";

type RechartsMockProps = {
  children?: ReactNode;
  dataKey?: string;
  fill?: string;
  innerRadius?: string | number;
  name?: string;
  outerRadius?: string | number;
  stroke?: string;
  value?: string;
};

vi.mock("recharts", () => ({
  Bar: ({ dataKey, fill, name }: RechartsMockProps) => (
    <div data-testid="bar-series" data-color={fill} data-key={dataKey}>
      {name}
    </div>
  ),
  BarChart: ({ children }: RechartsMockProps) => (
    <div data-testid="bar-chart">{children}</div>
  ),
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Label: ({ value }: RechartsMockProps) => (
    <span data-testid="recharts-axis-label">{value}</span>
  ),
  Legend: () => <div data-testid="recharts-legend" />,
  Line: ({ dataKey, name, stroke }: RechartsMockProps) => (
    <div data-testid="line-series" data-color={stroke} data-key={dataKey}>
      {name}
    </div>
  ),
  LineChart: ({ children }: RechartsMockProps) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Cell: ({ fill }: RechartsMockProps) => (
    <div data-testid="pie-slice" data-fill={fill} />
  ),
  Pie: ({
    children,
    fill,
    innerRadius,
    outerRadius,
  }: RechartsMockProps) => (
    <div
      data-testid="pie-series"
      data-fill={fill}
      data-inner-radius={innerRadius}
      data-outer-radius={outerRadius}
    >
      {children}
    </div>
  ),
  PieChart: ({ children }: RechartsMockProps) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  ResponsiveContainer: ({ children }: RechartsMockProps) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Tooltip: () => <div data-testid="chart-tooltip" />,
  XAxis: ({ children }: RechartsMockProps) => (
    <div data-testid="x-axis">{children}</div>
  ),
  YAxis: ({ children }: RechartsMockProps) => (
    <div data-testid="y-axis">{children}</div>
  ),
}));

function graph(overrides: Partial<AiAssistantGraph> = {}): AiAssistantGraph {
  return {
    type: "bar",
    title: "Profit Today",
    xAxisLabel: "Period",
    yAxisLabel: "Profit",
    valueFormat: "currency",
    labels: ["Today"],
    datasets: [
      {
        label: "Profit",
        data: [118],
        color: "#16a34a",
      },
    ],
    ...overrides,
  };
}

describe("AiAssistantChart", () => {
  afterEach(cleanup);

  it.each([
    ["line", "line-chart", "line-series"],
    ["bar", "bar-chart", "bar-series"],
    ["pie", "pie-chart", "pie-series"],
    ["doughnut", "pie-chart", "pie-series"],
  ] as const)("renders %s charts from the backend graph type", (
    type,
    chartTestId,
    seriesTestId,
  ) => {
    render(<AiAssistantChart graph={graph({ type })} />);

    const figure = screen.getByTestId("ai-assistant-chart");
    expect(figure.getAttribute("data-chart-type")).toBe(type);
    expect(screen.getByTestId(chartTestId)).toBeTruthy();
    expect(screen.getByTestId(seriesTestId)).toBeTruthy();
    expect(screen.getByText("Profit Today")).toBeTruthy();
    expect(screen.getAllByText("Period").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Profit").length).toBeGreaterThan(0);
  });

  it("keeps dataset labels, values, and colors intact", () => {
    render(<AiAssistantChart graph={graph()} />);

    expect(screen.getByTestId("bar-series").getAttribute("data-color")).toBe(
      "#16a34a",
    );
    expect(screen.getByText("Today")).toBeTruthy();
    expect(screen.getByText("AFN 118")).toBeTruthy();
  });

  it("keeps Cartesian labels and the series legend outside the Recharts drawing area", () => {
    render(<AiAssistantChart graph={graph()} />);

    const responsiveContainer = screen.getByTestId("responsive-container");
    const xAxisLabel = screen.getByTestId("chart-x-axis-label");
    const yAxisLabel = screen.getByTestId("chart-y-axis-label");
    const seriesLegend = screen.getByTestId("chart-series-legend");

    expect(xAxisLabel.textContent).toBe("Period");
    expect(yAxisLabel.textContent).toBe("Profit");
    expect(seriesLegend.textContent).toContain("Profit");
    expect(responsiveContainer.contains(xAxisLabel)).toBe(false);
    expect(responsiveContainer.contains(yAxisLabel)).toBe(false);
    expect(responsiveContainer.contains(seriesLegend)).toBe(false);
    expect(screen.queryByTestId("recharts-axis-label")).toBeNull();
    expect(screen.queryByTestId("recharts-legend")).toBeNull();
  });

  it("assigns stable palette colors when backend datasets omit colors", () => {
    const colorlessGraph = {
      ...graph(),
      datasets: [
        {
          label: "Sales",
          data: [1250],
        },
        {
          label: "Profit",
          data: [382.29],
        },
      ],
    } satisfies AiAssistantGraph;
    const { rerender } = render(<AiAssistantChart graph={colorlessGraph} />);

    const initialColors = screen
      .getAllByTestId("bar-series")
      .map((series) => series.getAttribute("data-color"));

    expect(initialColors).toHaveLength(2);
    expect(initialColors.every(Boolean)).toBe(true);
    expect(new Set(initialColors).size).toBe(2);

    rerender(<AiAssistantChart graph={colorlessGraph} />);

    expect(
      screen
        .getAllByTestId("bar-series")
        .map((series) => series.getAttribute("data-color")),
    ).toEqual(initialColors);
  });

  it("formats currency and number values with the expected app formatters", () => {
    expect(formatAiAssistantChartValue(118, "currency")).toBe("AFN 118");
    expect(formatAiAssistantChartValue(1234.56, "number")).toBe(
      new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 20,
      }).format(1234.56),
    );
  });

  it("renders number-formatted data rows", () => {
    render(
      <AiAssistantChart
        graph={graph({
          valueFormat: "number",
          datasets: [
            {
              label: "Orders",
              data: [1234.56],
              color: "#2563eb",
            },
          ],
        })}
      />,
    );

    expect(
      screen.getByText(
        new Intl.NumberFormat(undefined, {
          maximumFractionDigits: 20,
        }).format(1234.56),
      ),
    ).toBeTruthy();
  });

  it("handles empty, invalid, and mismatched data without crashing", () => {
    render(
      <AiAssistantChart
        graph={graph({
          labels: ["Today", "Yesterday"],
          datasets: [
            {
              label: "Profit",
              data: [Number.NaN],
              color: "#16a34a",
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("No chart data available.")).toBeTruthy();
    expect(screen.getAllByText("No value")).toHaveLength(2);

    cleanup();

    render(<AiAssistantChart graph={graph({ labels: [], datasets: [] })} />);
    expect(screen.getByText("No chart data available.")).toBeTruthy();
  });

  it("uses a doughnut hole and keeps pie colors exact", () => {
    render(<AiAssistantChart graph={graph({ type: "doughnut" })} />);

    const pie = screen.getByTestId("pie-series");
    expect(pie.getAttribute("data-fill")).toBe("#16a34a");
    expect(pie.getAttribute("data-inner-radius")).toBe("52%");
  });

  it("assigns a distinct color and label to every circular chart slice", () => {
    render(
      <AiAssistantChart
        graph={graph({
          type: "doughnut",
          labels: ["Rice", "Flour", "Oil"],
          datasets: [
            {
              label: "Quantity sold",
              data: [50, 30, 20],
              color: "#2563eb",
            },
          ],
        })}
      />,
    );

    const sliceColors = screen
      .getAllByTestId("pie-slice")
      .map((slice) => slice.getAttribute("data-fill"));

    expect(sliceColors).toHaveLength(3);
    expect(new Set(sliceColors).size).toBe(3);
    expect(screen.getByTestId("chart-slice-legend").textContent).toContain(
      "Rice",
    );
    expect(screen.getByTestId("chart-slice-legend").textContent).toContain(
      "Flour",
    );
    expect(screen.getByTestId("chart-slice-legend").textContent).toContain(
      "Oil",
    );
  });

  it("keeps the chart responsive on mobile and desktop breakpoints", () => {
    render(<AiAssistantChart graph={graph()} />);

    const chartFrame = screen.getByTestId("responsive-container").parentElement;
    expect(chartFrame?.className).toContain("h-64");
    expect(chartFrame?.className).toContain("sm:h-80");
    expect(chartFrame?.className).toContain("min-w-0");
  });
});
