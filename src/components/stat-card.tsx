// src/components/stat-card.tsx

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  accent?: "primary" | "emerald" | "amber" | "rose";
}) {
  const accentClasses: Record<string, string> = {
    primary: "bg-primary/10 text-primary",
    emerald: "bg-emerald-500/10 text-emerald-600",
    amber: "bg-amber-500/10 text-amber-600",
    rose: "bg-rose-500/10 text-rose-600",
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {value}
          </p>
          {trend ? (
            <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
              {trend.positive ? (
                <ArrowUpRight className="size-3.5" />
              ) : (
                <ArrowDownRight className="size-3.5" />
              )}
              {trend.value}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-xl",
            accentClasses[accent],
          )}
        >
          <Icon className="size-6" />
        </div>
      </CardContent>
    </Card>
  );
}
