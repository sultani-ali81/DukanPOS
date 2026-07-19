import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePurchases } from "@/hooks/use-purchases";
import { formatCurrency } from "@/lib/currency";
import { extractError } from "@/lib/error";
import {
  formatPurchaseDate,
  formatPurchaseDateTime,
} from "@/pages/purchases/purchase-utils";
import { updatePurchaseStatus } from "@/queries/purchase";
import type { PurchaseListItem, PurchaseStatus } from "@/types/purchases";
import {
  CheckCircle2,
  Eye,
  Loader2,
  PackageSearch,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { PurchasePaymentStatusBadge, PurchaseStatusBadge } from "./purchase-badges";

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, row) => (
        <TableRow key={row}>
          {Array.from({ length: 10 }).map((__, column) => (
            <TableCell key={column}>
              <div className="h-4 max-w-28 animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function EmptyPurchases({
  search,
  onClear,
}: {
  search: string;
  onClear: () => void;
}) {
  return (
    <div className="py-14 text-center">
      <PackageSearch className="mx-auto mb-3 size-9 text-muted-foreground/40" />
      <p className="font-medium">
        {search ? "No matching purchases" : "No purchases yet"}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {search
          ? `No suppliers or purchase numbers match “${search}”.`
          : "Create a purchase to record stock from a supplier."}
      </p>
      {search && (
        <Button type="button" variant="link" size="sm" onClick={onClear}>
          Clear search
        </Button>
      )}
    </div>
  );
}

export function PurchasesClient() {
  const navigate = useNavigate();
  const [updatingId, setUpdatingId] = useState<string>();
  const statusActionRef = useRef(false);
  const {
    purchases,
    totalItems,
    totalPages,
    itemsPerPage,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    mutate: refresh,
    isLoading,
    error,
  } = usePurchases();
  const from = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const to = Math.min(page * itemsPerPage, totalItems);

  const openPurchase = (purchase: PurchaseListItem) =>
    navigate(`/purchases/${purchase.id}`);

  const updateStatus = async (
    purchase: PurchaseListItem,
    status: Exclude<PurchaseStatus, "Draft">,
  ) => {
    if (statusActionRef.current || purchase.status !== "Draft") return;

    statusActionRef.current = true;
    setUpdatingId(purchase.id);
    try {
      const result = await updatePurchaseStatus(purchase.id, { status });
      await refresh();
      toast.success(
        status === "Done" ? "Purchase marked as done" : "Purchase cancelled",
        { description: result.message },
      );
    } catch (requestError: unknown) {
      toast.error(
        status === "Done" ? "Could not complete purchase" : "Could not cancel purchase",
        { description: extractError(requestError) },
      );
    } finally {
      statusActionRef.current = false;
      setUpdatingId(undefined);
    }
  };

  return (
    <div>
      <PageHeader
        title="Purchases"
        description="Review supplier purchases, balances, and payment status."
      >
        <Button onClick={() => navigate("/purchases/new")}>
          <Plus className="size-4" /> New purchase
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
        <div className="flex flex-col gap-4 border-b px-4 py-4 sm:px-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-semibold text-foreground">Purchase records</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {totalItems} {totalItems === 1 ? "purchase" : "purchases"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <SearchField
              value={search}
              onValueChange={handleSearch}
              onClear={clearSearch}
              placeholder="Search purchases…"
              aria-label="Search purchases"
              className="min-w-0 sm:w-72"
              inputClassName="w-full pr-9"
            />
            {isLoading && purchases.length > 0 && (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <CardContent className="p-0">
          <div className="hidden overflow-x-auto md:block">
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="pl-5">Purchase number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Inventory</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Purchase status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10}>
                      <EmptyPurchases search={search} onClear={clearSearch} />
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map((purchase) => (
                    <TableRow
                      key={purchase.id}
                      className="cursor-pointer"
                      onClick={() => openPurchase(purchase)}
                    >
                      <TableCell className="pl-5 font-mono font-medium">
                        {purchase.sequenceId}
                      </TableCell>
                      <TableCell className="max-w-48 truncate font-medium">
                        {purchase.customer?.name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-44 truncate text-muted-foreground">
                        {purchase.inventoryName ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-52 text-muted-foreground">
                        <span className="block truncate">
                          {purchase.items.length
                            ? purchase.items
                                .map((item) => item.product?.name ?? "Unknown product")
                                .join(", ")
                            : "—"}
                        </span>
                        <span className="text-xs">
                          {purchase.items.length} {purchase.items.length === 1 ? "item" : "items"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatPurchaseDate(purchase.customDate)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatPurchaseDateTime(purchase.createdAt)}
                      </TableCell>
                      <TableCell>
                        <PurchaseStatusBadge status={purchase.status} />
                      </TableCell>
                      <TableCell>
                        <PurchasePaymentStatusBadge status={purchase.paymentStatus} />
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatCurrency(purchase.totalPrice)}
                      </TableCell>
                      <TableCell className="pr-5">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`View purchase ${purchase.sequenceId}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              openPurchase(purchase);
                            }}
                          >
                            <Eye />
                          </Button>
                          {purchase.status === "Draft" && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                disabled={Boolean(updatingId)}
                                aria-label={`Complete purchase ${purchase.sequenceId}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void updateStatus(purchase, "Done");
                                }}
                              >
                                {updatingId === purchase.id ? (
                                  <Loader2 className="animate-spin" />
                                ) : (
                                  <CheckCircle2 />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:text-destructive"
                                disabled={Boolean(updatingId)}
                                aria-label={`Cancel purchase ${purchase.sequenceId}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void updateStatus(purchase, "Cancelled");
                                }}
                              >
                                <XCircle />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="p-3 md:hidden">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="h-32 animate-pulse rounded-lg bg-muted" />
                ))}
              </div>
            ) : purchases.length === 0 ? (
              <EmptyPurchases search={search} onClear={clearSearch} />
            ) : (
              <div className="space-y-3">
                {purchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    role="link"
                    tabIndex={0}
                    className="cursor-pointer rounded-lg border bg-white p-4 outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => openPurchase(purchase)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") openPurchase(purchase);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-mono text-sm font-semibold">
                          {purchase.sequenceId}
                        </p>
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {purchase.customer?.name ?? "—"}
                        </p>
                      </div>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatCurrency(purchase.totalPrice)}
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Purchase date: {formatPurchaseDate(purchase.customDate)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {purchase.inventoryName ?? "No inventory"} · {purchase.items.length}{" "}
                      {purchase.items.length === 1 ? "item" : "items"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Created: {formatPurchaseDateTime(purchase.createdAt)}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <PurchaseStatusBadge status={purchase.status} />
                      <PurchasePaymentStatusBadge status={purchase.paymentStatus} />
                    </div>
                    <div className="mt-4 flex gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(event) => {
                          event.stopPropagation();
                          openPurchase(purchase);
                        }}
                      >
                        <Eye /> View
                      </Button>
                      {purchase.status === "Draft" && (
                        <Button
                          type="button"
                          size="sm"
                          className="flex-1"
                          disabled={Boolean(updatingId)}
                          onClick={(event) => {
                            event.stopPropagation();
                            void updateStatus(purchase, "Done");
                          }}
                        >
                          {updatingId === purchase.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <CheckCircle2 />
                          )}
                          Done
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
            ? "No purchases"
            : `Showing ${from}–${to} of ${totalItems} purchases`
        }
      />
    </div>
  );
}
