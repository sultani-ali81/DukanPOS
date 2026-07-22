import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSale } from "@/hooks/use-sales";
import { formatCurrency } from "@/lib/currency";
import type { SalePaymentHistoryItem } from "@/types/sale";
import {
  ArrowLeft,
  CalendarClock,
  CircleUserRound,
  Hash,
  Loader2,
  PackageOpen,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  canCollectSalePayment,
  formatSaleDateTime,
  responseStatus,
} from "../sales-utils";
import { CollectPaymentDialog } from "./collect-payment-dialog";
import { SalePaymentStatusBadge, SaleStatusBadge } from "./sale-badges";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getCashierName(
  cashier: SalePaymentHistoryItem["cashier"],
): string {
  if (!cashier) return "Unknown cashier";

  const name = `${cashier.firstName} ${cashier.lastName}`.trim();
  return name || "Unknown cashier";
}

function DetailSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading sale">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-44 animate-pulse rounded bg-muted" />
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

export function SaleDetailClient() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sale, refresh, isLoading, isValidating, error, errorMessage } =
    useSale(id);
  const [paymentOpen, setPaymentOpen] = useState(false);

  if (isLoading) return <DetailSkeleton />;

  if (!sale) {
    const notFound = responseStatus(error) === 404;
    return (
      <div className="mx-auto flex min-h-80 max-w-lg flex-col items-center justify-center px-4 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
          <ReceiptText className="size-6 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-semibold">
          {notFound ? "Sale not found" : "Could not load sale"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {errorMessage ?? "The requested sale is unavailable."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/sales")}>
            <ArrowLeft /> Back to sales
          </Button>
          {!notFound && (
            <Button onClick={() => void refresh()}>
              <RefreshCw /> Retry
            </Button>
          )}
        </div>
      </div>
    );
  }

  const totalQuantity = sale.items.reduce(
    (total, item) => total + item.quantity,
    0,
  );
  const paidAmount = roundMoney(
    sale.paymentHistory.reduce(
      (total, payment) => total + payment.amount,
      0,
    ),
  );
  const rawPaymentProgress =
    sale.totalPrice > 0 && Number.isFinite(paidAmount)
      ? (paidAmount / sale.totalPrice) * 100
      : sale.paymentStatus === "fully_paid"
        ? 100
        : 0;
  const paymentProgress = Math.min(100, Math.max(0, rawPaymentProgress));
  const paymentProgressLabel = Math.round(paymentProgress);
  const canCollect = canCollectSalePayment(sale);

  return (
    <div>
      <PageHeader
        title={`Sale ${sale.sequenceId}`}
        description={`${sale.customer?.name ?? "Unknown customer"} · ${formatSaleDateTime(sale.createdAt)}`}
      >
        <Button variant="outline" onClick={() => navigate("/sales")}>
          <ArrowLeft /> Back
        </Button>
        {canCollect && (
          <Button onClick={() => setPaymentOpen(true)}>
            <WalletCards /> Collect payment
          </Button>
        )}
      </PageHeader>

      {errorMessage && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{errorMessage}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start bg-white sm:self-auto"
            onClick={() => void refresh()}
          >
            <RefreshCw /> Retry
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Items sold</CardTitle>
              {isValidating && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Refreshing sale"
                />
              )}
            </CardHeader>
            <CardContent className="p-0">
              {sale.items.length === 0 ? (
                <div className="py-14 text-center">
                  <PackageOpen className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No items were returned for this sale.
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
                          <TableHead className="pr-6 text-right">
                            Subtotal
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.items.map((item) => (
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
                              {formatCurrency(item.subTotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell className="pl-6 font-semibold" colSpan={2}>
                            Grand total
                          </TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">
                            {totalQuantity}
                          </TableCell>
                          <TableCell className="pr-6 text-right text-base font-bold tabular-nums text-primary">
                            {formatCurrency(sale.totalPrice)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>

                  <div className="divide-y sm:hidden">
                    {sale.items.map((item) => (
                      <div key={item.id} className="space-y-3 px-4 py-4">
                        <p className="font-medium">
                          {item.product?.name ?? "Unknown product"}
                        </p>
                        <dl className="grid grid-cols-2 gap-3 text-sm min-[420px]:grid-cols-3">
                          <div>
                            <dt className="text-xs text-muted-foreground">
                              Unit price
                            </dt>
                            <dd className="mt-1 tabular-nums">
                              {formatCurrency(item.unitPrice)}
                            </dd>
                          </div>
                          <div className="text-center">
                            <dt className="text-xs text-muted-foreground">
                              Quantity
                            </dt>
                            <dd className="mt-1 font-medium tabular-nums">
                              {item.quantity}
                            </dd>
                          </div>
                          <div className="text-right">
                            <dt className="text-xs text-muted-foreground">
                              Subtotal
                            </dt>
                            <dd className="mt-1 font-semibold tabular-nums">
                              {formatCurrency(item.subTotal)}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                    <div className="flex items-center justify-between bg-muted/30 px-4 py-4">
                      <div>
                        <p className="font-semibold">Grand total</p>
                        <p className="text-xs text-muted-foreground">
                          {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
                        </p>
                      </div>
                      <p className="text-lg font-bold tabular-nums text-primary">
                        {formatCurrency(sale.totalPrice)}
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
              {sale.paymentHistory.length === 0 ? (
                <div className="py-12 text-center">
                  <WalletCards className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    No payments recorded.
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden sm:block">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead className="pl-6">Payment date</TableHead>
                          <TableHead>Cashier</TableHead>
                          <TableHead className="pr-6 text-right">
                            Amount
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sale.paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="pl-6 text-muted-foreground">
                              {formatSaleDateTime(payment.paidAt)}
                            </TableCell>
                            <TableCell className="font-medium">
                              {getCashierName(payment.cashier)}
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
                    {sale.paymentHistory.map((payment) => (
                      <div key={payment.id} className="space-y-3 px-4 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Payment date
                            </p>
                            <p className="mt-1 text-sm font-medium">
                              {formatSaleDateTime(payment.paidAt)}
                            </p>
                          </div>
                          <p className="font-semibold tabular-nums text-primary">
                            {formatCurrency(payment.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">
                            Cashier
                          </p>
                          <p className="mt-1 text-sm">
                            {getCashierName(payment.cashier)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sale details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Hash className="size-4" /> Sale number
                  </dt>
                  <dd className="font-mono text-sm font-semibold">
                    {sale.sequenceId}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CircleUserRound className="size-4" /> Customer
                  </dt>
                  <dd className="max-w-44 text-right text-sm font-semibold">
                    {sale.customer?.name ?? "—"}
                  </dd>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <dt className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarClock className="size-4" /> Created
                  </dt>
                  <dd className="max-w-44 text-right text-sm font-medium">
                    {formatSaleDateTime(sale.createdAt)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <dt className="text-sm text-muted-foreground">
                    Sale status
                  </dt>
                  <dd>
                    <SaleStatusBadge status={sale.status} />
                  </dd>
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
                    {formatCurrency(sale.totalPrice)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">
                    Paid amount
                  </dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">
                    {formatCurrency(paidAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 border-t pt-4">
                  <dt className="font-semibold">Remaining balance</dt>
                  <dd className="text-xl font-bold tabular-nums text-primary">
                    {formatCurrency(sale.remainingBalance)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-sm text-muted-foreground">
                    Payment status
                  </dt>
                  <dd>
                    <SalePaymentStatusBadge status={sale.paymentStatus} />
                  </dd>
                </div>
              </dl>

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-medium text-foreground">
                    Payment progress
                  </span>
                  <span className="font-semibold tabular-nums text-muted-foreground">
                    {paymentProgressLabel}% received
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Payment received"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={paymentProgressLabel}
                  className="h-2.5 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-chart-2 transition-[width] duration-500"
                    style={{ width: `${paymentProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {formatCurrency(paidAmount)}
                  </span>{" "}
                  of {formatCurrency(sale.totalPrice)} received
                </p>
              </div>

              {canCollect && (
                <div className="border-t pt-4">
                  <Button
                    className="w-full"
                    onClick={() => setPaymentOpen(true)}
                  >
                    <WalletCards /> Collect payment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {paymentOpen && canCollect && (
        <CollectPaymentDialog
          sale={sale}
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
        />
      )}
    </div>
  );
}
