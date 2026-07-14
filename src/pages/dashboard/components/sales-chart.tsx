// src/pages/dashboard/components/sales-chart.tsx
import { formatCurrency } from "@/lib/data";
import type { DailyStats } from "@/types/dashboard";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SalesChartProps {
  data: DailyStats[];
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="min-w-[160px] rounded-xl border border-border bg-popover p-3 text-sm text-popover-foreground shadow-lg">
      <p className="mb-2 font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div
          key={entry.name}
          className="flex items-center justify-between gap-4"
        >
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: entry.color }}
            />
            {entry.name}
          </span>
          <span className="font-semibold tabular-nums text-foreground">
            {formatCurrency(entry.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────────

export function SalesChart({ data }: SalesChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-muted-foreground">
        No breakdown data available for this range.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    day: d.dayName.slice(0, 3), // Mon, Tue…
    fullDay: d.dayName,
    date: d.date,
    Sales: d.sales.total,
    Profit: d.profit.total,
  }));

  // y-axis tick formatter — compact AFN numbers
  const yFormatter = (v: number) =>
    v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={chartData}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        barGap={3}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={yFormatter}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: "var(--muted)", radius: 6 }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{
            fontSize: 12,
            paddingTop: 12,
            color: "var(--muted-foreground)",
          }}
        />
        <Bar
          dataKey="Sales"
          fill="var(--chart-1)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
        <Bar
          dataKey="Profit"
          fill="var(--chart-2)"
          radius={[4, 4, 0, 0]}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
