import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";

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

import { ArrowLeft, Calendar, Hash, Truck, Warehouse } from "lucide-react";

import LogsTable from "@/components/logs-table";
import { createAuditLogsMatcher } from "@/lib/audit-logs-cache";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { extractError } from "@/lib/error";
import { createStockMutationMatcher } from "@/lib/stock-cache";
import { cn } from "@/lib/utils";
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

// ── Page ──────────────────────────────────────────────────────────────────────

export function PurchaseDetailClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutate: mutateCache } = useSWRConfig();

  const [error, setError] = useState<string | null>(null);

  const {
    data: purchase,
    isLoading: loading,
    mutate: mutatePurchase,
  } = useSWR(
    id ? (["purchase-detail", id] as const) : null,
    ([, purchaseId]) => getPurchase(purchaseId),
    {
      onSuccess: () => setError(null),
      onError: (err: unknown) => setError(extractError(err)),
    },
  );
  const inventoryId = purchase?.inventoryId ?? "";
  const [confirming, setConfirming] = useState(false);
  const [stockingIn, setStockingIn] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const revalidateStockCaches = (currentPurchase: PurchaseDetail) =>
    mutateCache(
      createStockMutationMatcher({
        inventoryIds: new Set(
          currentPurchase.inventoryId ? [currentPurchase.inventoryId] : [],
        ),
        productIds: new Set(
          currentPurchase.items.map((item) => item.product.id),
        ),
        purchaseId: currentPurchase.id,
      }),
      undefined,
      { revalidate: true },
    );

  const handleCancelPurchase = async () => {
    if (!purchase) return;
    setCancelling(true);
    try {
      await updatePurchaseStatus(purchase.id, { status: "Cancelled" });
      await mutateCache(createCrudFamilyMatcher("purchases", purchase.id));
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

  // ── Confirm purchase ──────────────────────────────────────────────────────

  const handleConfirmPurchase = async () => {
    if (!purchase) return;
    setConfirming(true);
    try {
      await updatePurchaseStatus(purchase.id, { status: "Done" });
      await mutateCache(createCrudFamilyMatcher("purchases", purchase.id));
      toast.success("Purchase confirmed", {
        description: `Purchase #${purchase.sequenceId} is ready for stock-in.`,
      });
      await mutateCache(createAuditLogsMatcher(purchase.id), undefined, {
        revalidate: true,
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

      const detail = await mutatePurchase();
      if (!detail)
        throw new Error("Purchase not found after stock-in creation.");
      const pendingStockIn = detail.stockIns?.find(
        (s) => s.status === "Pending",
      );

      if (!pendingStockIn)
        throw new Error("Stock-in record not found after creation.");

      await updateStockIn(pendingStockIn.stockInId, { status: "Done" });
      await revalidateStockCaches(purchase);

      toast.success("Items moved to inventory", {
        description: `${purchase.items.length} item${purchase.items.length > 1 ? "s" : ""} added to inventory.`,
      });

      await mutateCache(
        createAuditLogsMatcher(pendingStockIn.stockInId),
        undefined,
        { revalidate: true },
      );
    } catch (err: unknown) {
      toast.error("Stock-in failed", { description: extractError(err) });
    } finally {
      setStockingIn(false);
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

  const grandTotal = purchase.totalPrice;
  const totalItems = purchase.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 py-8">
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

      <div className="grid gap-6 lg:grid-cols-5">
        {/* ── Left ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Purchased Items */}
          <Card>
            <CardHeader>
              <CardTitle>Purchased Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <hr />
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="pl-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Product
                    </TableHead>
                    <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      Unit Price
                    </TableHead>
                    <TableHead className="py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      Qty
                    </TableHead>
                    <TableHead className="pr-6 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-center">
                      Line Total
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchase.items.map((item, idx) => (
                    <TableRow
                      key={item.id}
                      className={cn(
                        idx % 2 === 0 ? "bg-background" : "bg-muted/20",
                      )}
                    >
                      <TableCell className="pl-6 py-3.5 font-medium text-foreground">
                        {item.product?.name}
                      </TableCell>
                      <TableCell className="py-3.5 text-center text-muted-foreground">
                        {fmtCurrency(item.unitPrice)}
                      </TableCell>
                      <TableCell className="py-3.5 text-center font-semibold text-foreground">
                        {item.quantity}
                      </TableCell>
                      <TableCell className="pr-6 py-3.5 text-center font-semibold text-foreground">
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
                    <TableCell className="py-3.5 text-center font-semibold text-foreground">
                      {totalItems}
                    </TableCell>
                    <TableCell className="pr-6 py-3.5 text-center text-lg font-bold text-primary">
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
              <hr />
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
                  <div className="flex items-center justify-between px-6 py-3.5  bg-muted/20">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Warehouse className="size-3.5 shrink-0" />
                      Destination Inventory
                    </dt>
                    <dd className="text-sm font-semibold text-foreground">
                      {purchase.inventoryName ?? inventoryId}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-2 space-y-6">
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

          {/* Audit history */}
          <Card className="mt-6 overflow-hidden">
            <CardHeader>
              <CardTitle>Logs History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LogsTable entityId={purchase.id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
