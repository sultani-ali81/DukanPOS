import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DashboardStockProduct } from "@/types/dashboard";
import { AlertTriangle } from "lucide-react";

interface StockAlertsProps {
  outOfStock: DashboardStockProduct[];
  lowStock: DashboardStockProduct[];
}

export function StockAlerts({ outOfStock, lowStock }: StockAlertsProps) {
  if (outOfStock.length === 0 && lowStock.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-destructive" />
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {outOfStock.map((p, i) => (
            <div
              key={`out-${p.id}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-red-100 bg-red-50/50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {p.name}
                </p>
                <p className="text-xs text-gray-500">{p.inventoryName}</p>
              </div>
              <Badge className="shrink-0 bg-red-100 text-red-600 border-red-200 hover:bg-red-100">
                Out of stock
              </Badge>
            </div>
          ))}

          {lowStock.map((p, i) => (
            <div
              key={`low-${p.id}-${i}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-900">
                  {p.name}
                </p>
                <p className="text-xs text-gray-500">{p.inventoryName}</p>
              </div>
              <Badge className="shrink-0 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100">
                {p.quantity} left
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
