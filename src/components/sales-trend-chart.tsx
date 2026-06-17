import { salesTrend, formatCurrency } from "@/lib/data"

export function SalesTrendChart() {
  const max = Math.max(...salesTrend.map((d) => d.sales))

  return (
    <div className="flex h-56 items-stretch gap-2 sm:gap-4">
      {salesTrend.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end justify-center">
            <div
              className="w-full max-w-12 rounded-t-md bg-primary transition-all hover:opacity-80"
              style={{ height: `${(d.sales / max) * 100}%` }}
              title={formatCurrency(d.sales)}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  )
}
