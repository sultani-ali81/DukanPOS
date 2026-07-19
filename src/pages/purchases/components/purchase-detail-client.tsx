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
import { formatCurrency } from "@/lib/currency";
import { createAuditLogsMatcher } from "@/lib/audit-logs-cache";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { extractError } from "@/lib/error";
import { createStockMutationMatcher } from "@/lib/stock-cache";
import {
  canAddPurchasePayment,
  canUpdatePurchaseStatus,
  formatPurchaseDate,
  formatPurchaseDateTime,
  paidPurchaseAmount,
  roundMoney,
} from "@/pages/purchases/purchase-utils";
import { getPurchase, updatePurchaseStatus } from "@/queries/purchase";
import { createStockIn, updateStockIn } from "@/queries/stock-in";
import type {
  PurchaseDetail,
  PurchasedItemResponse,
  PurchaseStatus,
} from "@/types/purchases";
import {
  ArrowLeft,
  CalendarClock,
  Hash,
  Loader2,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  Truck,
  WalletCards,
  Warehouse,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { PaymentDialog } from "./payment-dialog";
import { PurchasePaymentStatusBadge, PurchaseStatusBadge } from "./purchase-badges";
import { PurchaseFlowCard } from "./purchase-flow-card";
import LogsTable from "@/components/logs-table";

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading purchase">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-9 w-24 animate-pulse rounded bg-muted" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-96 animate-pulse rounded-lg bg-muted lg:col-span-2" />
        <div className="h-80 animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}

export function PurchaseDetailClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { mutate: mutateCache } = useSWRConfig();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<
    Exclude<PurchaseStatus, "Draft"> | undefined
  >();
  const [stockingIn, setStockingIn] = useState(false);
  const statusUpdateRef = useRef(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const {
    data: purchase,
    error,
    isLoading,
    isValidating,
    mutate: refresh,
  } = useSWR(
    id ? (["purchase-detail", id] as const) : null,
    ([, purchaseId]) => getPurchase(purchaseId),
  );
  const loadError = error
    ? extractError(error, "Could not load this purchase. Please try again.")
    : null;

  const refreshPurchase = async () => {
    const detail = await refresh();
    if (id) await mutateCache(createCrudFamilyMatcher("purchases", id));
    return detail;
  };

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

  const updateStatus = async (status: Exclude<PurchaseStatus, "Draft">) => {
    if (!purchase || !canUpdatePurchaseStatus(purchase.status)) return;
    if (statusUpdateRef.current) return;

    statusUpdateRef.current = true;
    setUpdatingStatus(status);
    setActionError(null);
    try {
      const result = await updatePurchaseStatus(purchase.id, { status });
      await refreshPurchase();
      await mutateCache(createAuditLogsMatcher(purchase.id), undefined, {
        revalidate: true,
      });
      toast.success(
        status === "Done" ? "Purchase marked as done" : "Purchase cancelled",
        { description: result.message },
      );
    } catch (requestError: unknown) {
      const message = extractError(requestError, "Could not update purchase.");
      setActionError(message);
      toast.error("Could not update purchase", { description: message });
    } finally {
      statusUpdateRef.current = false;
      setUpdatingStatus(undefined);
    }
  };

  const handleCreateStockIn = async () => {
    if (!purchase?.inventoryId || stockingIn) return;

    setStockingIn(true);
    setActionError(null);
    try {
      await createStockIn({
        purchaseId: purchase.id,
        inventoryId: purchase.inventoryId,
        items: purchase.items.map((item: PurchasedItemResponse) => ({
          purchaseItemId: item.id,
          quantity: item.quantity,
        })),
      });

      const detail = await refresh();
      const pendingStockIn = detail?.stockIns?.find(
        (stockIn) => stockIn.status === "Pending",
      );
      if (!pendingStockIn) {
        throw new Error("Stock-in record not found after creation.");
      }

      await updateStockIn(pendingStockIn.stockInId, { status: "Done" });
      await refreshPurchase();
      await revalidateStockCaches(purchase);
      await mutateCache(
        createAuditLogsMatcher(pendingStockIn.stockInId),
        undefined,
        { revalidate: true },
      );
      toast.success("Items moved to inventory", {
        description: `${purchase.items.length} item${purchase.items.length === 1 ? "" : "s"} added to inventory.`,
      });
    } catch (requestError: unknown) {
      const message = extractError(requestError, "Stock-in failed.");
      setActionError(message);
      toast.error("Stock-in failed", { description: message });
    } finally {
      setStockingIn(false);
    }
  };

  if (isLoading) return <DetailSkeleton />;

  if (!purchase) {
    return (
      <div className="mx-auto flex min-h-80 max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ReceiptText className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">Could not load purchase</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError ?? "The requested purchase is unavailable."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/purchases")}>
            <ArrowLeft /> Back to purchases
          </Button>
          <Button onClick={() => void refresh()}>
            <RefreshCw /> Retry
          </Button>
        </div>
      </div>
    );
  }

  const totalQuantity = purchase.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const paidAmount = paidPurchaseAmount(purchase);
  const remainingBalance = roundMoney(purchase.remainingBalance);
  const paymentHistory = purchase.paymentHistory ?? [];
  const canAddPayment = canAddPurchasePayment(purchase);
  const inventoryId = purchase.inventoryId ?? "";

  return (
    <div>
      <PageHeader
        title={`Purchase ${purchase.sequenceId}`}
        description={`${purchase.customer?.name ?? "Unknown supplier"} · ${formatPurchaseDate(purchase.customDate)}`}
      >
        <Button variant="outline" onClick={() => navigate("/purchases")}>
          <ArrowLeft /> Back
        </Button>
        {canAddPayment && (
          <Button onClick={() => setPaymentOpen(true)}>
            <WalletCards /> Add payment
          </Button>
        )}
      </PageHeader>

      {(actionError ?? loadError) && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{actionError ?? loadError}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start bg-white sm:self-auto"
            onClick={() => {
              setActionError(null);
              void refresh();
            }}
          >
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Purchased items</CardTitle>
              {isValidating && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Refreshing purchase"
                />
              )}
            </CardHeader>
            <CardContent className="p-0">
              {purchase.items.length === 0 ? (
                <div className="py-14 text-center">
                  <PackageOpen className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No items were returned for this purchase.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="pl-6">Product</TableHead>
                          <TableHead className="text-right">Unit price</TableHead>
                          <TableHead className="text-right">Quantity</TableHead>
                          <TableHead className="pr-6 text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {purchase.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="pl-6 font-medium">
                              {item.product?.name ?? "Unknown product"}
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="pr-6 text-right font-semibold tabular-nums">
                              {formatCurrency(roundMoney(item.unitPrice * item.quantity))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="pl-6 font-semibold" colSpan={2}>
                            Purchase total
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {totalQuantity}
                          </TableCell>
                          <TableCell className="pr-6 text-right text-base font-bold tabular-nums text-primary">
                            {formatCurrency(purchase.totalPrice)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div className="divide-y sm:hidden">
                    {purchase.items.map((item) => (
                      <div key={item.id} className="space-y-3 px-4 py-4">
                        <p className="font-medium">
                          {item.product?.name ?? "Unknown product"}
                        </p>
                        <dl className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <dt className="text-xs text-muted-foreground">Unit price</dt>
                            <dd className="mt-1 tabular-nums">
                              {formatCurrency(item.unitPrice)}
                            </dd>
                          </div>
                          <div className="text-center">
                            <dt className="text-xs text-muted-foreground">Quantity</dt>
                            <dd className="mt-1 font-medium tabular-nums">{item.quantity}</dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-xs text-muted-foreground">Subtotal</dt>
                            <dd className="mt-1 font-semibold tabular-nums">
                              {formatCurrency(roundMoney(item.unitPrice * item.quantity))}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-muted/30 px-4 py-4">
                      <div>
                        <p className="font-semibold">Purchase total</p>
                        <p className="text-xs text-muted-foreground">
                          {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <p className="text-lg font-bold tabular-nums text-primary">
                        {formatCurrency(purchase.totalPrice)}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {paymentHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <WalletCards className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">No payments recorded.</p>
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="pl-6">Date &amp; time</TableHead>
                          <TableHead className="pr-6 text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="pl-6 text-muted-foreground">
                              {formatPurchaseDateTime(payment.paidAt)}
                            </TableCell>
                            <TableCell className="pr-6 text-right font-semibold tabular-nums">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="divide-y sm:hidden">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="space-y-3 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Payment date</p>
                            <p className="mt-1 text-sm font-medium">
                              {formatPurchaseDateTime(payment.paidAt)}
                            </p>
                          </div>
                          <p className="font-semibold tabular-nums text-primary">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Logs History</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <LogsTable entityId={purchase.id} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <PurchaseFlowCard
            purchase={purchase}
            onConfirm={() => void updateStatus("Done")}
            confirming={updatingStatus === "Done"}
            onCancel={() => void updateStatus("Cancelled")}
            cancelling={updatingStatus === "Cancelled"}
            onStockIn={() => void handleCreateStockIn()}
            stockingIn={stockingIn}
            inventoryId={inventoryId}
          />

          <Card>
            <CardHeader>
              <CardTitle>Purchase details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="size-4" /> Purchase number
                  </dt>
                  <dd className="font-mono text-sm font-semibold">{purchase.sequenceId}</dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Truck className="size-4" /> Supplier
                  </dt>
                  <dd className="max-w-44 text-right text-sm font-semibold">
                    {purchase.customer?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="size-4" /> Purchase date
                  </dt>
                  <dd className="max-w-44 text-right text-sm font-medium">
                    {formatPurchaseDate(purchase.customDate)}
                  </dd>
                </div>
                {purchase.inventoryId && (
                  <div className="flex items-start justify-between gap-4">
                    <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Warehouse className="size-4" /> Inventory
                    </dt>
                    <dd className="max-w-44 text-right text-sm font-medium">
                      {purchase.inventoryName ?? purchase.inventoryId}
                    </dd>
                  </div>
                )}
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <dt className="text-sm text-muted-foreground">Purchase status</dt>
                  <dd><PurchaseStatusBadge status={purchase.status} /></dd>
                </div>
              </dl>

            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Total</dt>
                  <dd className="font-semibold tabular-nums">
                    {formatCurrency(purchase.totalPrice)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Paid</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(paidAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <dt className="font-semibold">Remaining balance</dt>
                  <dd className="text-xl font-bold tabular-nums text-primary">
                    {formatCurrency(remainingBalance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">Payment status</dt>
                  <dd>
                    <PurchasePaymentStatusBadge status={purchase.paymentStatus} />
                  </dd>
                </div>
              </dl>

              {canAddPayment && (
                <div className="border-t pt-4">
                  <Button className="w-full" onClick={() => setPaymentOpen(true)}>
                    <WalletCards /> Add payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {paymentOpen && canAddPayment && (
        <PaymentDialog
          purchase={purchase}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          onSuccess={refreshPurchase}
        />
      )}
    </div>
  );
}
