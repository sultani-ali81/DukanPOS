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
} from "@/components/ui/select";
import { MoreHorizontal, Plus, Search, XIcon } from "lucide-react";

import { NumberDisplay } from "@/components/number-display";
import { PageHeader } from "@/components/page-header";
import { usePurchases } from "@/hooks/use-purchases";
import { extractError } from "@/lib/error";
import { deletePurchase, updatePurchaseStatus } from "@/queries/purchase";
import type { PurchaseListItem, PurchaseStatus } from "@/types/purchases";

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

function deriveStockInCompletion(
  purchase: PurchaseListItem,
): StockInCompletion {
  const items = purchase.items ?? [];
  if (items.length === 0) return "None";
  return items.every((i) => (i.received ?? 0) >= i.quantity)
    ? "Complete"
    : "Incomplete";
}

// ── Date sort select ──────────────────────────────────────────────────────────

const DATE_SORT_OPTIONS = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export function PurchasesClient() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dateSort, setDateSort] = useState<"newest" | "oldest">("newest");

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
    isLoading,
    mutate,
  } = usePurchases();

  const from = totalItems === 0 ? 0 : (page - 1) * itemsPerPage + 1;
  const to = Math.min(page * itemsPerPage, totalItems);

  const sortedPurchases = [...purchases].sort((a, b) => {
    const ta = a.customDate ? new Date(a.customDate).getTime() : 0;
    const tb = b.customDate ? new Date(b.customDate).getTime() : 0;
    return dateSort === "newest" ? tb - ta : ta - tb;
  });

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
      <PageHeader title="Purchases" description="View and manage purchases" />

      <div>
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

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-md font-semibold text-gray-900">
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
              <Button
                onClick={() => navigate("/purchases/new")}
                className="h-10 text-sm gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Add Purchase
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Header */}
              <div className="grid grid-cols-7 justify-items-center items-center bg-gray-50 py-3 px-4 border-b border-gray-100">
                {["Purchase #", "Customer", "Total Price"].map((h) => (
                  <span
                    key={h}
                    className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    {h}
                  </span>
                ))}
                {/* Date sort */}
                <Select
                  value={dateSort}
                  onValueChange={(v) => setDateSort(v as "newest" | "oldest")}
                >
                  <SelectTrigger className="h-auto border-0 bg-transparent p-0 shadow-none text-xs font-semibold text-gray-700 uppercase tracking-wide gap-1 focus:ring-0">
                    <span className="w-10">Date</span>
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {DATE_SORT_OPTIONS.map((opt) => (
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
                {["Status", "Stock In", "Actions"].map((h) => (
                  <span
                    key={h}
                    className="text-xs font-semibold text-gray-700 uppercase tracking-wide"
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-100">
                {isLoading ? (
                  <p className="px-5 py-12 text-center text-gray-400 text-sm">
                    Loading purchases…
                  </p>
                ) : sortedPurchases.length === 0 ? (
                  <p className="px-5 py-12 text-center text-gray-400 text-sm">
                    {search
                      ? `No purchases matching "${search}"`
                      : "No purchases found"}
                  </p>
                ) : (
                  sortedPurchases.map((item) => {
                    const itemStatus = item.status;
                    const stockInStatus = deriveStockInCompletion(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => navigate(`/purchases/${item.id}`)}
                        className="grid grid-cols-7 justify-items-center items-center text-center py-4 px-2 hover:bg-gray-50/80 transition-colors cursor-pointer"
                      >
                        <p className="text-xs font-mono text-gray-700">
                          #{item.sequenceId}
                        </p>
                        <p className="text-xs font-medium text-gray-800 truncate max-w-[120px]">
                          {item.customer?.name}
                        </p>
                        <p className="text-xs font-semibold text-gray-900 whitespace-nowrap">
                          <NumberDisplay value={item.totalPrice} decimals={0} />{" "}
                          AFN
                        </p>
                        <p className="text-xs text-gray-800 whitespace-nowrap">
                          {fmtDate(item.customDate)}
                        </p>
                        <div className="flex">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${PURCHASE_STATUS_STYLES[itemStatus] ?? "bg-gray-100 text-gray-600"}`}
                          >
                            {itemStatus}
                          </span>
                        </div>
                        <div className="flex">
                          <span
                            className={`text-xs px-2.5 py-1 rounded-full font-medium ${STOCK_IN_BADGE[stockInStatus]}`}
                          >
                            {stockInStatus}
                          </span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={loadingId === item.id}
                              className="h-8 w-8 p-0 rounded-lg cursor-pointer hover:bg-primary/20"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal
                                size={16}
                                className="text-gray-700"
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
                                navigate(`/purchases/${item.id}`);
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

          {/* Pagination */}
          <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-600">
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
