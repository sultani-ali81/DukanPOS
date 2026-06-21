import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoreHorizontal, Plus, Search, XIcon } from "lucide-react";

import { NumberDisplay } from "@/components/number-display";
import { usePurchases } from "@/hooks/use-purchases";
import { extractError } from "@/lib/error";
import { deletePurchase, updatePurchaseStatus } from "@/queries/purchase";
import type { PurchaseListItem, PurchaseStatus } from "@/types/purchases";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: { label: string; value: string }[] = [
  { label: "All Statuses", value: "ALL" },
  { label: "Draft", value: "Draft" },
  { label: "Done", value: "Done" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Pending", value: "Pending" },
];

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

const PURCHASE_STATUS_STYLES: Record<PurchaseStatus, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Done: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-500",
  Pending: "bg-yellow-100 text-yellow-700",
};

type StockInCompletion = "Complete" | "Incomplete" | "None";

const STOCK_IN_BADGE: Record<StockInCompletion, string> = {
  Complete: "bg-green-50 text-green-700 border border-green-200",
  Incomplete: "bg-orange-50 text-orange-600 border border-orange-200",
  None: "bg-gray-50 text-gray-400 border border-gray-200",
};

/**
 * Complete   = every item has received >= quantity
 * Incomplete = at least one item still has unassigned units
 * None       = purchase has no items (edge case)
 */
function deriveStockInCompletion(
  purchase: PurchaseListItem,
): StockInCompletion {
  const items = purchase.items ?? [];
  if (items.length === 0) return "None";
  return items.every((i) => (i.received ?? 0) >= i.quantity)
    ? "Complete"
    : "Incomplete";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PurchasesClient() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Paginated list (for the table) ─────────────────────────────────────────
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
    status,
    setStatus,
    isLoading,
    mutate,
  } = usePurchases();

  const from = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const to = Math.min(page * itemsPerPage, totalItems);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setLoadingId(id);
    setError(null);
    try {
      await deletePurchase(id);
      await mutate();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setLoadingId(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: PurchaseStatus) => {
    setLoadingId(id);
    setError(null);
    try {
      await updatePurchaseStatus(id, { status: newStatus });
      await mutate();
    } catch (err: unknown) {
      setError(extractError(err));
    } finally {
      setLoadingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="overflow-y-auto">
      <div className="max-w-[1401px] mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* Error banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 ml-4 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Table card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-semibold text-gray-900">
                Purchase Records
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {totalItems} record{totalItems !== 1 ? "s" : ""} found
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 lg:shrink-0">
              {!searchOpen ? (
                <Button
                  variant="default"
                  size="sm"
                  className="h-10 w-10 p-0 rounded-md"
                  onClick={() => setSearchOpen(true)}
                >
                  <Search size={15} className="text-white" />
                </Button>
              ) : (
                <div className="relative sm:w-56">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <Input
                    autoFocus
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search purchases..."
                    className="h-10 pl-9 pr-8 rounded-xl border-gray-200 text-sm bg-white"
                  />
                  <XIcon
                    size={14}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 cursor-pointer hover:text-gray-600"
                    onClick={() => {
                      clearSearch();
                      setSearchOpen(false);
                    }}
                  />
                </div>
              )}
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="rounded-sm border-gray-200 text-sm w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      className="text-sm"
                    >
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => navigate("/Purchases/new")}
                className="h-10 rounded-lg bg-black text-white hover:bg-black/90 text-sm gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Purchase
              </Button>
            </div>
          </div>

          {/* Table — horizontally scrollable on all screen sizes */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Header */}
              <div className="grid grid-cols-7 justify-items-center bg-gray-50 py-3 px-4 border-b border-gray-100">
                {[
                  "Purchase #",
                  "Customer",
                  "Total Price",
                  "Date",
                  "Status",
                  "Stock In",
                  "Actions",
                ].map((h) => (
                  <span
                    key={h}
                    className="text-xs font-semibold text-gray-500 uppercase tracking-wide"
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-gray-100">
                {isLoading ? (
                  <p className="px-5 py-12 text-center text-gray-400 text-sm">
                    Loading purchases…
                  </p>
                ) : purchases.length === 0 ? (
                  <p className="px-5 py-12 text-center text-gray-400 text-sm">
                    {search
                      ? `No purchases matching "${search}"`
                      : "No purchases found"}
                  </p>
                ) : (
                  purchases.map((item) => {
                    const itemStatus = item.status;
                    const stockInStatus = deriveStockInCompletion(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/Purchases/${item.id}`)}
                        className="grid grid-cols-7 justify-items-center items-center text-center py-4 px-2 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        {/* Purchase # */}
                        <p className="text-xs font-mono text-gray-500">
                          #{item.sequenceId}
                        </p>

                        {/* Customer */}
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">
                          {item.customer?.name}
                        </p>

                        {/* Total price */}
                        <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                          <NumberDisplay value={item.totalPrice} decimals={0} />{" "}
                          AFN
                        </p>

                        {/* Date */}
                        <p className="text-xs text-gray-600 whitespace-nowrap">
                          {fmtDate(item.customDate)}
                        </p>

                        {/* Purchase status */}
                        <div className="flex">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${PURCHASE_STATUS_STYLES[itemStatus] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {itemStatus}
                          </span>
                        </div>

                        {/* Stock-in status */}
                        <div className="flex">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${STOCK_IN_BADGE[stockInStatus]}`}
                          >
                            {stockInStatus}
                          </span>
                        </div>

                        {/* Actions dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={loadingId === item.id}
                              className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 disabled:opacity-40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal
                                size={16}
                                className="text-gray-500"
                              />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="rounded-xl w-44"
                          >
                            <DropdownMenuItem
                              className="text-xs cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/Purchases/${item.id}`);
                              }}
                            >
                              View
                            </DropdownMenuItem>
                            {itemStatus !== "Cancelled" &&
                              itemStatus !== "Done" && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-xs cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStatusChange(item.id, "Cancelled");
                                    }}
                                  >
                                    Cancel Purchase
                                  </DropdownMenuItem>
                                </>
                              )}
                            {itemStatus === "Draft" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-xs cursor-pointer text-red-500 focus:text-red-500"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(item.id);
                                  }}
                                >
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Pagination footer */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {totalItems === 0
                ? "No records"
                : `Showing ${from}–${to} of ${totalItems} records`}
            </span>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
