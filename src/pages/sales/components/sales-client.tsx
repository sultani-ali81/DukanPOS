import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SALES_PAGE_SIZES, useSale, useSales } from "@/hooks/use-sales";
import { formatCurrency } from "@/lib/currency";
import { extractError } from "@/lib/error";
import type { SaleListItem } from "@/types/sale";
import {
  Eye,
  Loader2,
  Plus,
  ReceiptText,
  RefreshCw,
  WalletCards,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { canCollectSalePayment, formatSaleDateTime } from "../sales-utils";
import { CollectPaymentDialog } from "./collect-payment-dialog";
import { SalePaymentStatusBadge, SaleStatusBadge } from "./sale-badges";

function SalesTableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={index}>
          {Array.from({ length: 7 }).map((__, cellIndex) => (
            <TableCell key={cellIndex}>
              <div className="h-4 max-w-28 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function SalesCardSkeleton() {
  return (
    <div className="space-y-3 xl:hidden">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border bg-white p-4"
        >
          <div className="flex justify-between gap-3">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="h-8 w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

export function SalesClient() {
  const navigate = useNavigate();
  const [paymentSaleId, setPaymentSaleId] = useState<string>();
  const loadingPaymentRef = useRef(false);
  const {
    sale: paymentSale,
    isLoading: paymentSaleLoading,
    isValidating: paymentSaleValidating,
  } = useSale(paymentSaleId, {
    onSuccess: (detail) => {
      loadingPaymentRef.current = false;
      if (!canCollectSalePayment(detail)) {
        toast.info("No payment is currently due for this sale.");
        setPaymentSaleId(undefined);
      }
    },
    onError: (requestError) => {
      loadingPaymentRef.current = false;
      setPaymentSaleId(undefined);
      toast.error(
        extractError(requestError, "Could not load the sale balance."),
      );
    },
  });
  const loadingPaymentSaleId =
    paymentSaleId && (paymentSaleLoading || paymentSaleValidating)
      ? paymentSaleId
      : null;
  const {
    sales,
    page,
    pageSize,
    totalItems,
    totalCount,
    totalPages,
    search,
    setPage,
    setPageSize,
    setSearch,
    clearSearch,
    refresh,
    isLoading,
    isValidating,
    error,
  } = useSales();

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const openSale = (sale: SaleListItem) => navigate(`/sales/${sale.id}`);
  const mayHaveOutstandingPayment = (sale: SaleListItem) =>
    sale.status !== "Cancelled" && sale.paymentStatus !== "fully_paid";

  const openPayment = (sale: SaleListItem) => {
    if (loadingPaymentRef.current) return;
    loadingPaymentRef.current = true;
    setPaymentSaleId(sale.id);
  };

  return (
    <div>
      <PageHeader
        title="Sales"
        description="Review completed sales and collect outstanding payments."
      >
        <Button onClick={() => navigate("/pos")}>
          <Plus className="size-4" /> New sale
        </Button>
      </PageHeader>

      {error && (
        <div
          role="alert"
          className="mb-4 flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="self-start bg-white sm:self-auto"
            onClick={() => void refresh()}
          >
            <RefreshCw className="size-3.5" /> Retry
          </Button>
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 border-b px-4 pb-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Sale records</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {search
                ? `${totalItems} matching ${totalItems === 1 ? "sale" : "sales"} out of ${totalCount}`
                : `${totalItems} ${totalItems === 1 ? "sale" : "sales"}`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchField
              value={search}
              onValueChange={setSearch}
              onClear={clearSearch}
              placeholder="Search by customer name…"
              aria-label="Search sales by customer name"
              className="min-w-0 sm:w-72"
              inputClassName="w-full pr-9"
            />

            <div className="flex items-center gap-2">
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                Rows
              </span>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  if (value) setPageSize(Number(value));
                }}
              >
                <SelectTrigger
                  aria-label="Sales per page"
                  className="w-[76px]"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALES_PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isValidating && !isLoading && (
                <Loader2
                  className="size-4 animate-spin text-muted-foreground"
                  aria-label="Refreshing sales"
                />
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-0">
          <div className="hidden overflow-x-auto xl:block">
            <Table className="min-w-[920px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-5">Sale number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date &amp; time</TableHead>
                  <TableHead>Sale status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <SalesTableSkeleton />
                ) : sales.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-52 text-center">
                      <ReceiptText className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                      <p className="font-medium text-foreground">
                        {search ? "No matching sales" : "No sales yet"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {search
                          ? `No customers match “${search}”.`
                          : "New sales will appear here after checkout."}
                      </p>
                      {search && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="mt-2"
                          onClick={clearSearch}
                        >
                          Clear search
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  sales.map((sale) => (
                    <TableRow
                      key={sale.id}
                      className="cursor-pointer"
                      onClick={() => openSale(sale)}
                    >
                      <TableCell className="pl-5 font-mono font-medium">
                        {sale.sequenceId}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {sale.customer?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatSaleDateTime(sale.createdAt)}
                      </TableCell>
                      <TableCell>
                        <SaleStatusBadge status={sale.status} />
                      </TableCell>
                      <TableCell>
                        <SalePaymentStatusBadge status={sale.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(sale.totalPrice)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View sale ${sale.sequenceId}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openSale(sale);
                            }}
                          >
                            <Eye />
                          </Button>
                          {mayHaveOutstandingPayment(sale) && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              disabled={loadingPaymentSaleId !== null}
                              aria-label={`Collect payment for sale ${sale.sequenceId}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                void openPayment(sale);
                              }}
                            >
                              {loadingPaymentSaleId === sale.id ? (
                                <Loader2 className="animate-spin" />
                              ) : (
                                <WalletCards />
                              )}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-3 xl:hidden">
            {isLoading ? (
              <SalesCardSkeleton />
            ) : sales.length === 0 ? (
              <div className="py-14 text-center">
                <ReceiptText className="mx-auto mb-3 size-9 text-muted-foreground/40" />
                <p className="font-medium">
                  {search ? "No matching sales" : "No sales yet"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search
                    ? `No customers match “${search}”.`
                    : "New sales will appear here after checkout."}
                </p>
                {search && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={clearSearch}
                  >
                    Clear search
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {sales.map((sale) => (
                  <div
                    key={sale.id}
                    role="link"
                    tabIndex={0}
                    onClick={() => openSale(sale)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" &&
                        event.target === event.currentTarget
                      ) {
                        openSale(sale);
                      }
                    }}
                    className="cursor-pointer rounded-lg border bg-white p-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold">
                          {sale.sequenceId}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {sale.customer?.name ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(sale.totalPrice)}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-muted-foreground">
                      {formatSaleDateTime(sale.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <SaleStatusBadge status={sale.status} />
                      <SalePaymentStatusBadge status={sale.paymentStatus} />
                    </div>
                    <div className="mt-4 flex gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          openSale(sale);
                        }}
                      >
                        <Eye /> View
                      </Button>
                      {mayHaveOutstandingPayment(sale) && (
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          disabled={loadingPaymentSaleId !== null}
                          onClick={(event) => {
                            event.stopPropagation();
                            void openPayment(sale);
                          }}
                        >
                          {loadingPaymentSaleId === sale.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <WalletCards />
                          )}
                          Collect
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <PaginationFooter
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
        summary={
          totalItems === 0
            ? "No sales"
            : `Showing ${from}–${to} of ${totalItems} sales`
        }
      />

      {paymentSale && !paymentSaleValidating && (
        <CollectPaymentDialog
          sale={paymentSale}
          open
          onOpenChange={(open) => {
            if (!open) setPaymentSaleId(undefined);
          }}
        />
      )}

    </div>
  );
}
