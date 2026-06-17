"use client";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatCurrency,
  getInventoryName,
  type Purchase,
  type PurchaseStatus,
} from "@/lib/data";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Package,
  Truck,
  Warehouse,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

function StatusBadge({ status }: { status: PurchaseStatus }) {
  const config: Record<
    PurchaseStatus,
    {
      label: string;
      variant: "secondary" | "default" | "destructive" | "outline";
    }
  > = {
    draft: { label: "Draft", variant: "outline" },
    done: { label: "Done", variant: "default" },
    stocked_in: { label: "Stocked In", variant: "secondary" },
    cancelled: { label: "Cancelled", variant: "destructive" },
  };
  const { label, variant } = config[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function StepFlow({
  status,
  stockedIn,
  onMarkDone,
  onStockIn,
  onCancel,
}: {
  status: PurchaseStatus;
  stockedIn: boolean;
  onMarkDone: () => void;
  onStockIn: () => void;
  onCancel: () => void;
}) {
  const isCancelled = status === "cancelled";

  const steps = [
    {
      label: "Draft",
      sublabel: "Purchase created",
      icon: Circle,
      state:
        status === "draft"
          ? "active"
          : status === "done" || status === "stocked_in"
            ? "done"
            : "pending",
    },
    {
      label: "Done",
      sublabel: "Marked as complete",
      icon: CheckCircle2,
      state:
        status === "done"
          ? "active"
          : status === "stocked_in"
            ? "done"
            : "pending",
    },
    {
      label: "Stock-In",
      sublabel: "Items received",
      icon: Package,
      state: stockedIn ? "done" : status === "stocked_in" ? "done" : "pending",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Step indicators */}
        <div className="flex items-center gap-0">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                {/* Step circle */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                      step.state === "done"
                        ? "border-primary bg-primary text-white"
                        : step.state === "active"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground/30"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-xs font-semibold ${
                        step.state === "done"
                          ? "text-primary"
                          : step.state === "active"
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {step.sublabel}
                    </p>
                  </div>
                </div>
                {/* Connector line */}
                {!isLast && (
                  <div
                    className={`mb-6 h-0.5 w-16 sm:w-24 ${
                      steps[idx + 1].state !== "pending"
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Action buttons — only valid ones are clickable */}
        {!isCancelled && (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {status === "draft" && (
              <>
                <Button onClick={onMarkDone}>
                  <CheckCircle2 className="size-4" /> Mark as Done
                </Button>
                <Button
                  variant="outline"
                  onClick={onCancel}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="size-4" /> Cancel
                </Button>
              </>
            )}
            {(status === "done" || status === "draft") && !stockedIn && (
              <Button onClick={onStockIn}>
                <Package className="size-4" /> Stock-In
              </Button>
            )}
            {status === "done" && (
              <Button
                variant="ghost"
                onClick={onCancel}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <XCircle className="size-4" /> Cancel
              </Button>
            )}
            {stockedIn && (
              <div className="flex w-full items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-white/90 dark:text-primary-200">
                <CheckCircle2 className="size-4" />
                Purchase fully complete — all steps done.
              </div>
            )}
          </div>
        )}

        {isCancelled && (
          <div className="flex w-full items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <XCircle className="size-4" />
            This purchase has been cancelled.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function PurchaseDetailClient({ purchase }: { purchase: Purchase }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<PurchaseStatus>(purchase.status);
  const [stockedIn, setStockedIn] = useState(purchase.stockedIn);

  const totalItems = purchase.lines.reduce((sum, l) => sum + l.quantity, 0);

  function handleMarkAsDone() {
    setStatus("done");
    toast.success("Purchase marked as done", {
      description: `${purchase.reference} is now completed. You can now stock in the items.`,
    });
  }

  function handleStockIn() {
    setStockedIn(true);
    setStatus("stocked_in");
    toast.success("Stock received", {
      description: `Items from ${purchase.reference} have been added to ${getInventoryName(purchase.inventoryId)}.`,
    });
  }

  function handleCancel() {
    setStatus("cancelled");
    toast.warning("Purchase cancelled", {
      description: `${purchase.reference} has been cancelled.`,
    });
  }

  return (
    <div>
      <PageHeader
        title={purchase.reference}
        description={`Purchase from ${purchase.supplier} • ${purchase.date}`}
      >
        <Button
          type="button"
          variant="outline"
          render={<Link ref="/purchases" />}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: line items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Products table */}
          <Card>
            <CardHeader>
              <CardTitle>Products</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-44">Product</TableHead>
                      <TableHead className="w-24 text-right">Qty</TableHead>
                      <TableHead className="w-32 text-right">
                        Unit Price
                      </TableHead>
                      <TableHead className="w-32 text-right">
                        Subtotal
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.lines.map((line, idx) => (
                      <TableRow key={`${line.productId}-${idx}`}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {line.productName}
                          </div>
                          {line.variantName && (
                            <div className="text-xs text-muted-foreground">
                              {line.variantName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {line.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(line.price)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(line.quantity * line.price)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: details + summary */}
        <div className="space-y-6">
          {/* Flow stepper */}
          <StepFlow
            status={status}
            stockedIn={stockedIn}
            onMarkDone={handleMarkAsDone}
            onStockIn={handleStockIn}
            onCancel={handleCancel}
          />

          {/* Summary card */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total items</span>
                <span className="font-medium text-foreground">
                  {totalItems}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-base font-bold text-foreground">
                  Total Amount
                </span>
                <span className="text-2xl font-bold text-primary">
                  {formatCurrency(purchase.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Purchase details */}
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Truck className="size-3.5" /> Supplier
                </span>
                <span className="font-medium text-foreground">
                  {purchase.supplier}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Warehouse className="size-3.5" /> Inventory
                </span>
                <span className="font-medium text-foreground">
                  {getInventoryName(purchase.inventoryId)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">
                  {purchase.date}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={status} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
