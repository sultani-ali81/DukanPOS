import React from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PurchaseDetail } from "@/types/purchases";
import {
  CheckCircle2,
  Circle,
  Package,
  PackagePlus,
  XCircle,
} from "lucide-react";

// ── Step derivation ───────────────────────────────────────────────────────────

type FlowStepState = "done" | "active" | "pending";

interface FlowStep {
  label: string;
  icon: typeof Circle;
  state: FlowStepState;
}

function getFlowSteps(purchase: PurchaseDetail): FlowStep[] {
  const status = purchase.status;
  const receivedQty = (purchase.items ?? []).reduce(
    (s, i) => s + (i.received ?? 0),
    0,
  );
  const totalQty = (purchase.items ?? []).reduce((s, i) => s + i.quantity, 0);
  const allReceived = purchase.items?.length > 0 && receivedQty >= totalQty;
  const hasStockIns = (purchase.stockIns ?? []).length > 0;

  const draftState: FlowStepState = status === "Draft" ? "active" : "done";

  const confirmedState: FlowStepState =
    status === "Draft" ? "pending" : allReceived ? "done" : "active";

  // Only becomes active once the user has actually triggered stock-in
  // (hasStockIns), not simply because the purchase was confirmed.
  const stockedInState: FlowStepState =
    status === "Draft" || !hasStockIns
      ? "pending"
      : allReceived
        ? "done"
        : "active";

  return [
    { label: "Draft", icon: Circle, state: draftState },
    { label: "Confirmed", icon: CheckCircle2, state: confirmedState },
    { label: "Stocked In", icon: Package, state: stockedInState },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PurchaseFlowCardProps {
  purchase: PurchaseDetail;
  onConfirm: () => void;
  confirming: boolean;
  onCancel: () => void;
  cancelling: boolean;
  onStockIn: () => void;
  stockingIn: boolean;
  inventoryId: string;
}

export function PurchaseFlowCard({
  purchase,
  onConfirm,
  confirming,
  onCancel,
  cancelling,
  onStockIn,
  stockingIn,
  inventoryId,
}: PurchaseFlowCardProps) {
  if (purchase.status === "Cancelled") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Purchase Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3">
            <XCircle className="size-5 text-red-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-600">
                Purchase Cancelled
              </p>
              <p className="text-xs text-red-400">
                This purchase will not proceed further.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const steps = getFlowSteps(purchase);
  const stockIns = purchase.stockIns ?? [];
  const hasStockIns = stockIns.length > 0;

  return (
    <Card className="sm:w-100">
      <CardHeader>
        <CardTitle>Purchase Flow</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start">
          {steps.map((step, idx, arr) => {
            const Icon = step.icon;
            const isLast = idx === arr.length - 1;
            return (
              <React.Fragment key={step.label}>
                <div className="flex flex-col items-center gap-1 w-16 shrink-0">
                  <div
                    className={`flex size-9 items-center justify-center rounded-full border-2 transition-all ${
                      step.state === "done"
                        ? "border-primary bg-primary text-white"
                        : step.state === "active"
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/30 text-muted-foreground/30"
                    }`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <p
                    className={`text-xs font-semibold text-center leading-tight ${
                      step.state === "done" || step.state === "active"
                        ? "text-primary"
                        : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mt-4 shrink-0 ${
                      step.state === "done"
                        ? "bg-primary"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Draft actions */}
        {purchase.status === "Draft" && (
          <div className="space-y-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full gap-1.5"
                  disabled={confirming || cancelling}
                >
                  <CheckCircle2 className="size-4" />
                  {confirming ? "Confirming…" : "Confirm Purchase"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm this purchase?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Purchase{" "}
                    <span className="font-mono font-medium">
                      #{purchase.sequenceId}
                    </span>{" "}
                    will be marked as confirmed and ready for stock-in.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction onClick={onConfirm}>
                    Confirm Purchase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-12 w-full gap-1.5 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  disabled={confirming || cancelling}
                >
                  <XCircle className="size-4" />
                  {cancelling ? "Cancelling…" : "Cancel Purchase"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel this purchase?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Purchase{" "}
                    <span className="font-mono font-medium">
                      #{purchase.sequenceId}
                    </span>{" "}
                    will be cancelled and cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Go Back</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onCancel}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Cancel Purchase
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Stock-in action */}
        {purchase.status === "Done" && inventoryId && !hasStockIns && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="lg"
                className="h-12 w-full gap-1.5"
                disabled={stockingIn}
              >
                <PackagePlus className="size-4" />
                {stockingIn ? "Processing…" : "Confirm Stock-In"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Move items to inventory?</AlertDialogTitle>
                <AlertDialogDescription>
                  All items from purchase{" "}
                  <span className="font-mono font-medium">
                    #{purchase.sequenceId}
                  </span>{" "}
                  will be moved to the selected inventory.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Go Back</AlertDialogCancel>
                <AlertDialogAction onClick={onStockIn}>
                  Confirm Stock-In
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardContent>
    </Card>
  );
}
