import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, products, sales } from "@/lib/data";
import {
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Package,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function DashboardPage() {
  const navigate = useNavigate();
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  const todaySales = sales.reduce((sum, s) => sum + s.total, 0);
  const todayProfit = sales.reduce((sum, s) => sum + s.profit, 0);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Welcome back, here is your store at a glance."
      >
        <Button onClick={() => navigate("/pos")}>
          New Sale <ArrowRight className="size-4" />
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(todaySales)}
          icon={DollarSign}
          trend={{ value: "12% vs yesterday", positive: true }}
        />
        <StatCard
          label="Today's Profit"
          value={formatCurrency(todayProfit)}
          icon={TrendingUp}
          trend={{ value: "8% vs yesterday", positive: true }}
        />
        <StatCard
          label="Total Products"
          value={products.length.toString()}
          icon={Package}
        />
        <StatCard
          label="Low Stock Items"
          value={lowStock.length.toString()}
          icon={AlertTriangle}
          trend={{ value: "Needs attention", positive: false }}
        />
      </div>

      <div className="mt-6">
        <div className="flex flex-row items-center justify-between">
          <h3>Recent Sales</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/reports")}
          >
            View all
          </Button>
        </div>
        <div className="space-y-2">
          {sales.map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {s.invoiceNo}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {s.customer} · {s.items} items · {s.date}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-foreground">
                  {formatCurrency(s.total)}
                </p>
                <p className="text-xs text-muted-foreground">
                  +{formatCurrency(s.profit)} profit
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {lowStock.length > 0 ? (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {p.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Threshold: {p.lowStockThreshold}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0">
                  {p.stock} left
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
