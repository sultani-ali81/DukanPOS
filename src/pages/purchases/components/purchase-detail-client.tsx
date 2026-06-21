import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Circle,
  Hash,
  Package,
  PackagePlus,
  User,
  Warehouse,
  XCircle,
} from "lucide-react";

import { extractError } from "@/lib/error";
import { getPurchase, updatePurchaseStatus } from "@/queries/purchase";
import { createStockIn } from "@/queries/stock-in";
import type {
  CreateStockInPayload,
  PurchaseDetail,
  PurchasedItemResponse,
  PurchaseStatus,
} from "@/types/purchases";
import InventoryCombobox from "./inventory-combobox";
import { PaymentDialog } from "./payment-dialog";
import { StockInSidebar } from "./stock-in-sidebar";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const normalized = iso.includes("T") ? iso : `${iso}T12:00:00Z`;
  return new Date(normalized).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtCurrency(n: number) {
  return "AFN " + Number(n).toLocaleString("id-ID");
}

const STATUS_STYLES: Record<PurchaseStatus, { badge: string; dot: string }> = {
  Draft: {
    badge: "bg-gray-100 text-gray-600 border border-gray-200",
    dot: "bg-gray-400",
  },
  Done: {
    badge: "bg-green-50 text-green-700 border border-green-200",
    dot: "bg-green-500",
  },
  Cancelled: {
    badge: "bg-red-50 text-red-500 border border-red-200",
    dot: "bg-red-400",
  },
  Pending: {
    badge: "bg-yellow-50 text-yellow-700 border border-yellow-200",
    dot: "bg-yellow-400",
  },
};

const getRemaining = (item: PurchasedItemResponse): number =>
  Math.max(0, item.quantity - (item.received ?? 0));

// A row is locked only when received >= ordered (confirmed done)
const isRowLocked = (item: PurchasedItemResponse): boolean =>
  (item.received ?? 0) >= item.quantity;

// ── Purchase flow step derivation ──────────────────────────────────────────────

type FlowStepState = "done" | "active" | "pending";

interface FlowStep {
  label: string;
  sublabel: string;
  icon: typeof Circle;
  state: FlowStepState;
}

function getFlowSteps(purchase: PurchaseDetail): FlowStep[] {
  const status = purchase.status;
  const isStockInAllowed = status === "Done" || status === "Pending";
  const allReceived =
    purchase.items.length > 0 &&
    purchase.items.every((i) => (i.received ?? 0) >= i.quantity);

  const draftState: FlowStepState = status === "Draft" ? "active" : "done";
  const paidState: FlowStepState =
    status === "Draft" ? "pending" : allReceived ? "done" : "active";
  const stockInState: FlowStepState = !isStockInAllowed
    ? "pending"
    : allReceived
      ? "done"
      : "active";

  return [
    {
      label: "Draft",
      sublabel: "Purchase created",
      icon: Circle,
      state: draftState,
    },
    {
      label: "Paid",
      sublabel: "Payment recorded",
      icon: CheckCircle2,
      state: paidState,
    },
    {
      label: "Stock-In",
      sublabel: "Items received",
      icon: Package,
      state: stockInState,
    },
  ];
}

function PurchaseFlowCard({ purchase }: { purchase: PurchaseDetail }) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-0">
          {steps.map((step, idx, arr) => {
            const Icon = step.icon;
            const isLast = idx === arr.length - 1;
            return (
              <div key={step.label} className="flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`flex size-10 items-center justify-center rounded-full border-2 transition-all ${
                      step.state === "done"
                        ? "border-emerald-500 bg-emerald-500 text-white"
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
                          ? "text-emerald-600"
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
                {!isLast && (
                  <div
                    className={`mb-6 h-0.5 w-16 sm:w-24 ${
                      arr[idx + 1].state !== "pending"
                        ? "bg-emerald-500"
                        : "bg-muted-foreground/20"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PurchaseDetailClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Stock-in form state (lives here so both the table and the Purchase
  // Details card's inventory field can share it, like the New Purchase form)
  const [inventoryId, setInventoryId] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  // ── Load / refresh ──────────────────────────────────────────────────────────

  const loadPurchase = (silently = false) => {
    if (!id) return;
    if (!silently) setLoading(true);
    getPurchase(id)
      .then((data) => setPurchase(data))
      .catch((err: unknown) => setError(extractError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPurchase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Reset stock-in quantities whenever the purchase data changes
  useEffect(() => {
    if (!purchase) return;
    const initial: Record<string, number> = {};
    purchase.items.forEach((item) => {
      initial[item.id] = 0;
    });
    setQuantities(initial);
  }, [purchase]);

  // ── Cancel purchase ─────────────────────────────────────────────────────────

  const handleCancel = async () => {
    if (!purchase) return;
    setCancelling(true);
    try {
      await updatePurchaseStatus(purchase.id, { status: "Cancelled" });
      setPurchase((prev) => (prev ? { ...prev, status: "Cancelled" } : prev));
      toast.success("Purchase cancelled", {
        description: `Purchase #${purchase.sequenceId} has been cancelled.`,
      });
    } catch (err: unknown) {
      toast.error("Could not cancel purchase", {
        description: extractError(err),
      });
    } finally {
      setCancelling(false);
    }
  };

  // ── Stock-in submit ──────────────────────────────────────────────────────────

  const itemsWithQty =
    purchase?.items.filter((i) => (quantities[i.id] ?? 0) > 0) ?? [];
  const canSubmitStockIn = itemsWithQty.length > 0 && !!inventoryId;

  const handleConfirmStockIn = async () => {
    if (!purchase) return;

    if (!inventoryId) {
      toast.error("No inventory selected", {
        description: "Please select an inventory to continue.",
      });
      return;
    }
    if (itemsWithQty.length === 0) {
      toast.error("No quantities set", {
        description: "Set a quantity greater than 0 for at least one item.",
      });
      return;
    }

    const payload: CreateStockInPayload = {
      purchaseId: purchase.id,
      inventoryId,
      items: itemsWithQty.map((i) => ({
        purchaseItemId: i.id,
        quantity: quantities[i.id],
      })),
    };

    try {
      setSubmitting(true);
      await createStockIn(payload);
      toast.success("Stock-in created", {
        description: `${itemsWithQty.length} item${itemsWithQty.length > 1 ? "s" : ""} added to inventory.`,
      });
      setQuantities((prev) =>
        Object.fromEntries(Object.keys(prev).map((k) => [k, 0])),
      );
      setInventoryId("");
      loadPurchase(true);
    } catch (err: unknown) {
      toast.error("Stock-in failed", { description: extractError(err) });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Callbacks ───────────────────────────────────────────────────────────────

  const handlePaymentSuccess = () => {
    setPurchase((prev) => (prev ? { ...prev, status: "Done" } : prev));
    toast.success("Payment recorded", {
      description: "This purchase has been marked as paid.",
    });
  };

  const handleStockInDone = (_stockInId: string) => loadPurchase(true);

  const handleStockInCancelled = (_stockInId: string) => loadPurchase(true);

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center text-gray-400 text-sm">
        Loading purchase…
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-red-500 text-sm mb-4">
          {error ?? "Purchase not found."}
        </p>
        <Button variant="outline" onClick={() => navigate("/Purchases")}>
          Back to Purchases
        </Button>
      </div>
    );
  }

  const status = purchase.status;
  const style = STATUS_STYLES[status] ?? STATUS_STYLES.Draft;
  const isStockInAllowed = status === "Done" || status === "Pending";
  const totalItems = purchase.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title={`Purchase #${purchase.sequenceId}`}
        description={`${purchase.customer?.name ?? "—"} · ${fmtDate(purchase.customDate)}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full ${style.badge}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
            {status}
          </span>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/purchases")}
          >
            <ArrowLeft className="size-4" /> Back
          </Button>

          {status === "Draft" && (
            <>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={cancelling}
                    className="border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
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
                      will be permanently cancelled. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Go Back</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancel}
                      className="bg-red-500 hover:bg-red-600 text-white"
                    >
                      Cancel Purchase
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <PaymentDialog
                purchase={purchase}
                onSuccess={handlePaymentSuccess}
              />
            </>
          )}
        </div>
      </PageHeader>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-600 ml-4 text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: line items + action */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Purchased Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-44">Product</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                      {isStockInAllowed && (
                        <>
                          <TableHead className="text-center">
                            Received
                          </TableHead>
                          <TableHead className="text-center">
                            Stock In Qty
                          </TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchase.items.map((item) => {
                      const remaining = getRemaining(item);
                      const locked = isRowLocked(item);
                      const qty = quantities[item.id] ?? 0;

                      return (
                        <TableRow
                          key={item.id}
                          className={locked ? "opacity-50" : ""}
                        >
                          <TableCell className="font-medium">
                            {item.product?.name}
                          </TableCell>
                          <TableCell className="text-right">
                            {fmtCurrency(item.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {fmtCurrency(item.unitPrice * item.quantity)}
                          </TableCell>

                          {isStockInAllowed && (
                            <>
                              {/* Received progress */}
                              <TableCell className="text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <span className="text-xs font-medium text-muted-foreground">
                                    {item.received ?? 0}/{item.quantity}
                                  </span>
                                  <div className="w-16 h-1 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gray-700 transition-all"
                                      style={{
                                        width: `${Math.round(((item.received ?? 0) / item.quantity) * 100)}%`,
                                      }}
                                    />
                                  </div>
                                </div>
                              </TableCell>

                              {/* Qty input */}
                              <TableCell className="text-center">
                                {locked ? (
                                  <span className="inline-flex items-center text-[10px] font-medium text-green-600 bg-green-50 border border-green-100 rounded-full px-2 py-0.5">
                                    Done
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <Input
                                      type="number"
                                      min={0}
                                      max={remaining}
                                      value={qty}
                                      onChange={(e) => {
                                        const val = Math.min(
                                          Math.max(
                                            0,
                                            e.target.valueAsNumber || 0,
                                          ),
                                          remaining,
                                        );
                                        setQuantities((prev) => ({
                                          ...prev,
                                          [item.id]: val,
                                        }));
                                      }}
                                      className="h-8 w-16 text-center"
                                    />
                                    <span className="text-[10px] text-muted-foreground">
                                      {remaining} left
                                    </span>
                                  </div>
                                )}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {isStockInAllowed && (
            <Card>
              <CardContent className="space-y-3 p-5">
                <p className="text-xs text-muted-foreground">
                  Set quantities above and assign an inventory to confirm the
                  stock-in.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    size="lg"
                    onClick={handleConfirmStockIn}
                    disabled={submitting || !canSubmitStockIn}
                    className="h-12 w-auto gap-1.5"
                  >
                    <PackagePlus className="size-4" />
                    {submitting
                      ? "Processing…"
                      : `Create Stock In${itemsWithQty.length > 0 ? ` (${itemsWithQty.length} item${itemsWithQty.length > 1 ? "s" : ""})` : ""}`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: flow + details */}
        <div className="space-y-6">
          <PurchaseFlowCard purchase={purchase} />

          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <User className="size-3.5" /> Customer
                </Label>
                <p className="text-sm font-semibold text-foreground">
                  {purchase.customer?.name ?? "—"}
                </p>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Calendar className="size-3.5" /> Date
                </Label>
                <p className="text-sm font-semibold text-foreground">
                  {fmtDate(purchase.customDate)}
                </p>
              </div>
              <div className="grid gap-2">
                <Label className="flex items-center gap-1.5">
                  <Hash className="size-3.5" /> Reference
                </Label>
                <p className="text-sm font-semibold text-foreground">
                  #{purchase.sequenceId}
                </p>
              </div>

              {isStockInAllowed && (
                <div className="grid gap-2">
                  <Label
                    htmlFor="inventory"
                    className="flex items-center gap-1.5"
                  >
                    <Warehouse className="size-3.5" /> Assign to Inventory
                  </Label>
                  <InventoryCombobox
                    value={inventoryId}
                    onChange={setInventoryId}
                  />
                </div>
              )}

              <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                <span className="text-muted-foreground">Total Items</span>
                <span className="font-medium text-foreground">
                  {totalItems}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-foreground">
                  Grand Total
                </span>
                <span className="text-2xl font-bold text-primary">
                  {fmtCurrency(purchase.totalPrice)}
                </span>
              </div>
            </CardContent>
          </Card>

          {isStockInAllowed && (
            <StockInSidebar
              purchase={purchase}
              onStockInDone={handleStockInDone}
              onStockInCancelled={handleStockInCancelled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
