import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Hash,
  Package,
  Truck,
  Warehouse,
} from "lucide-react";

import { extractError } from "@/lib/error";
import { getPurchase, updatePurchaseStatus } from "@/queries/purchase";
import { createStockIn, updateStockIn } from "@/queries/stock-in";
import type { PurchaseDetail, PurchasedItemResponse } from "@/types/purchases";
import { PurchaseFlowCard } from "./purchase-flow-card";

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

type StockInRecord = NonNullable<PurchaseDetail["stockIns"]>[number];
type StockInProduct = NonNullable<StockInRecord["products"]>[number];

// ── Page ──────────────────────────────────────────────────────────────────────

export function PurchaseDetailClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [error, setError] = useState<string | null>(null);

  const [purchase, setPurchase] = useState<PurchaseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const inventoryId = purchase?.inventoryId ?? "";
  const [confirming, setConfirming] = useState(false);
  const [stockingIn, setStockingIn] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const handleCancelPurchase = async () => {
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

  // ── Load / refresh ────────────────────────────────────────────────────────

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

  // ── Confirm purchase ──────────────────────────────────────────────────────

  const handleConfirmPurchase = async () => {
    if (!purchase) return;
    setConfirming(true);
    try {
      await updatePurchaseStatus(purchase.id, { status: "Done" });
      setPurchase((prev) => (prev ? { ...prev, status: "Done" } : prev));
      toast.success("Purchase confirmed", {
        description: `Purchase #${purchase.sequenceId} is ready for stock-in.`,
      });
    } catch (err: unknown) {
      toast.error("Could not confirm purchase", {
        description: extractError(err),
      });
    } finally {
      setConfirming(false);
    }
  };

  // ── Stock-In ──────────────────────────────────────────────────────────────

  const handleCreateStockIn = async () => {
    if (!purchase || !inventoryId) return;
    setStockingIn(true);
    try {
      if (purchase.status === "Draft") {
        await updatePurchaseStatus(purchase.id, { status: "Done" });
      }

      await createStockIn({
        purchaseId: purchase.id,
        inventoryId,
        items: purchase.items.map((i: PurchasedItemResponse) => ({
          purchaseItemId: i.id,
          quantity: i.quantity,
        })),
      });

      const detail = await getPurchase(purchase.id);
      const pendingStockIn = detail.stockIns?.find(
        (s) => s.status === "Pending",
      );

      if (!pendingStockIn)
        throw new Error("Stock-in record not found after creation.");

      await updateStockIn(pendingStockIn.stockInId, { status: "Done" });

      toast.success("Items moved to inventory", {
        description: `${purchase.items.length} item${purchase.items.length > 1 ? "s" : ""} added to inventory.`,
      });

      loadPurchase(true);
    } catch (err: unknown) {
      toast.error("Stock-in failed", { description: extractError(err) });
    } finally {
      setStockingIn(false);
    }
  };

  // ── Approve existing pending stock-in ─────────────────────────────────────

  const handleApproveStockIn = async (stockInId: string) => {
    setApprovingId(stockInId);
    try {
      await updateStockIn(stockInId, { status: "Done" });
      toast.success("Stock-in confirmed", {
        description: "Items have been added to inventory.",
      });
      loadPurchase(true);
    } catch (err: unknown) {
      toast.error("Could not confirm stock-in", {
        description: extractError(err),
      });
    } finally {
      setApprovingId(null);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────

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
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          Back to Purchases
        </Button>
      </div>
    );
  }

  const stockIns = purchase.stockIns ?? [];
  const hasStockIns = stockIns.length > 0;
  const grandTotal = purchase.totalPrice;
  const totalItems = purchase.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <PageHeader
        title={`Purchase #${purchase.sequenceId}`}
        description={`${purchase.customer?.name ?? "—"} · ${fmtDate(purchase.customDate)}`}
      >
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/purchases")}
        >
          <ArrowLeft className="size-4" /> Back
        </Button>
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
        {/* ── Left ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchased Items */}
          <Card>
            <CardHeader>
              <CardTitle>Purchased Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Unit Price
                    </TableHead>
                    <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Qty
                    </TableHead>
                    <TableHead className="pr-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">
                      Line Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      className={
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20"
                      }
                    >
                      <TableCell className="pl-6 py-3.5 font-medium text-foreground">
                        {item.product?.name}
                      </TableCell>
                      <TableCell className="py-3.5 text-right text-muted-foreground">
                        {fmtCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="py-3.5 text-right font-semibold text-foreground">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="pr-6 py-3.5 text-right font-semibold text-foreground">
                        {fmtCurrency(item.unitPrice * item.quantity)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="border-t-2 border-border bg-muted/30">
                    <TableCell
                      className="pl-6 py-3.5 text-sm font-semibold text-foreground"
                      colSpan={2}
                    >
                      Total
                    </TableCell>
                    <TableCell className="py-3.5 text-right font-semibold text-foreground">
                      {totalItems}
                    </TableCell>
                    <TableCell className="pr-6 py-3.5 text-right text-lg font-bold text-primary">
                      {fmtCurrency(grandTotal)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Purchase Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <dl>
                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="size-3.5 shrink-0" />
                    Supplier
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {purchase.customer?.name ?? "—"}
                  </dd>
                </div>

                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/20">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="size-3.5 shrink-0" />
                    Purchase Date
                  </dt>
                  <dd className="text-sm font-semibold text-foreground">
                    {fmtDate(purchase.customDate)}
                  </dd>
                </div>

                <div className="flex items-center justify-between px-6 py-3.5 border-b border-border">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="size-3.5 shrink-0" />
                    Reference
                  </dt>
                  <dd className="text-sm font-mono font-semibold text-foreground">
                    #{purchase.sequenceId}
                  </dd>
                </div>

                {inventoryId && (
                  <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-muted/20">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Warehouse className="size-3.5 shrink-0" />
                      Destination Inventory
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {stockIns[0]?.inventoryName ?? inventoryId}
                    </dd>
                  </div>
                )}

                <div className="flex items-center justify-between px-6 py-4 bg-muted/30 rounded-b-xl">
                  <dt className="text-base font-bold text-foreground">
                    Grand Total
                  </dt>
                  <dd className="text-2xl font-bold text-primary">
                    {fmtCurrency(grandTotal)}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="flex-col w-sm sm:pl-3 space-y-6">
          <PurchaseFlowCard
            purchase={purchase}
            onConfirm={handleConfirmPurchase}
            confirming={confirming}
            onCancel={handleCancelPurchase}
            cancelling={cancelling}
            onStockIn={handleCreateStockIn}
            stockingIn={stockingIn}
            inventoryId={inventoryId}
          />
          {/* Stock-In Records */}
          {hasStockIns && (
            <Card className="w-sm">
              <CardHeader>
                <CardTitle>Stock-In Records</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {stockIns.map((stockIn: StockInRecord, idx: number) => {
                    const products: StockInProduct[] = stockIn.products ?? [];
                    const totalQty = products.reduce(
                      (sum, p) => sum + p.quantity,
                      0,
                    );
                    const isPending = stockIn.status === "Pending";
                    const isDone = stockIn.status === "Done";
                    const isApproving = approvingId === stockIn.stockInId;

                    return (
                      <div
                        key={stockIn.stockInId}
                        className="flex items-center justify-between px-6 py-4 gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex size-8 items-center justify-center rounded-full ${
                              isDone ? "bg-primary/10" : "bg-muted"
                            }`}
                          >
                            <Package
                              className={`size-4 ${isDone ? "text-primary" : "text-muted-foreground"}`}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Stock-In #{idx + 1}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {products.length} line
                              {products.length !== 1 ? "s" : ""} · {totalQty}{" "}
                              unit
                              {totalQty !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                              isDone
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : isPending
                                  ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                  : "bg-red-50 text-red-500 border border-red-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isDone
                                  ? "bg-green-500"
                                  : isPending
                                    ? "bg-yellow-400"
                                    : "bg-red-400"
                              }`}
                            />
                            {stockIn.status}
                          </span>

                          {isPending && (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() =>
                                handleApproveStockIn(stockIn.stockInId)
                              }
                              disabled={isApproving}
                              className="h-8 text-xs gap-1.5"
                            >
                              <CheckCircle2 className="size-3.5" />
                              {isApproving ? "Confirming…" : "Confirm"}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
