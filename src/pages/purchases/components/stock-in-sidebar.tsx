import { useState } from "react";

import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, Package } from "lucide-react";

import { extractError } from "@/lib/error";
import { updateStockIn } from "@/queries/stock-in";
import type { PurchaseDetail, StockInResponse } from "@/types/purchases";

// ── Props ─────────────────────────────────────────────────────────────────────

interface StockInSidebarProps {
  purchase: PurchaseDetail;
  onStockInDone?: (stockInId: string) => void;
  onStockInCancelled?: (stockInId: string) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StockInSidebar({
  purchase,
  onStockInDone,
  onStockInCancelled,
}: StockInSidebarProps) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const stockIns: StockInResponse[] = purchase.stockIns ?? [];

  const pendingStockIns = stockIns.filter((s) => s.status === "Pending");

  // ── Counts ────────────────────────────────────────────────────────────────

  const totalOrdered = purchase.items.reduce((sum, i) => sum + i.quantity, 0);
  const totalAssigned = purchase.items.reduce(
    (sum, i) => sum + (i.received ?? 0),
    0,
  );

  // Unassigned = units not yet confirmed Done (only decreases when Mark as Done is clicked)
  const totalUnassigned = Math.max(0, totalOrdered - totalAssigned);

  // Mark as Done is disabled only when all items have been confirmed (assigned === ordered)
  const allConfirmed = totalAssigned >= totalOrdered;

  // ── Actions ───────────────────────────────────────────────────────────────

  const act = async (
    key: string,
    fn: () => Promise<unknown>,
    onSuccess: () => void,
  ) => {
    setLoading((p) => ({ ...p, [key]: true }));
    setErrors((p) => ({ ...p, [key]: "" }));
    try {
      await fn();
      onSuccess();
    } catch (err) {
      setErrors((p) => ({ ...p, [key]: extractError(err) }));
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const handleDone = (stockIn: StockInResponse) =>
    act(
      `done:${stockIn.stockInId}`,
      () => updateStockIn(stockIn.stockInId, { status: "Done" }),
      () => onStockInDone?.(stockIn.stockInId),
    );

  const handleCancel = (stockIn: StockInResponse) =>
    act(
      `cancel:${stockIn.stockInId}`,
      () => updateStockIn(stockIn.stockInId, { status: "Cancelled" }),
      () => onStockInCancelled?.(stockIn.stockInId),
    );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-radial from-bg-dark2 to-bg-dark2/90 px-4 py-4">
        <h2 className="text-sm font-semibold text-white">Stock In Status</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Track assignment and fulfilment
        </p>
      </div>

      {/* Summary pills — Unassigned + Assigned only */}
      <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">
            Unassigned
          </p>
          <p
            className={`text-lg font-bold leading-none ${totalUnassigned > 0 ? "text-orange-500" : "text-green-600"}`}
          >
            {totalUnassigned}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">units</p>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 font-medium mb-0.5">
            Assigned
          </p>
          <p className="text-lg font-bold leading-none text-gray-800">
            {totalAssigned}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">of {totalOrdered}</p>
        </div>
      </div>

      {/* Pending stock-ins */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50 px-1 pb-2">
        {pendingStockIns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">
              No pending stock-ins
            </p>
            <p className="text-xs text-gray-400 mt-1">
              All recorded stock-ins have been completed.
            </p>
          </div>
        ) : (
          pendingStockIns.map((stockIn) => {
            const doneKey = `done:${stockIn.stockInId}`;
            const cancelKey = `cancel:${stockIn.stockInId}`;
            const doneBusy = loading[doneKey];
            const cancelBusy = loading[cancelKey];
            const anyBusy = doneBusy || cancelBusy;

            return (
              <div key={stockIn.stockInId} className="px-3 py-3">
                {/* Header row */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-yellow-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[110px]">
                      {stockIn.inventoryName}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-yellow-600 bg-yellow-50 border border-yellow-100 rounded-full px-2 py-0.5">
                    {stockIn.sequenceId}
                  </span>
                </div>

                {/* Products */}
                <div className="space-y-1 mb-3">
                  {(stockIn.products ?? []).map((product) => (
                    <div
                      key={product.purchasedItemId}
                      className="flex items-center justify-between text-[11px] text-gray-600"
                    >
                      <div className="flex items-center gap-1 min-w-0">
                        <Package className="w-2.5 h-2.5 text-gray-400 shrink-0" />
                        <span className="truncate">{product.productName}</span>
                      </div>
                      <span className="font-semibold text-gray-800 shrink-0 ml-2">
                        ×{product.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Errors */}
                {(errors[doneKey] || errors[cancelKey]) && (
                  <p className="text-[10px] text-red-500 mb-2">
                    {errors[doneKey] || errors[cancelKey]}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={anyBusy || allConfirmed}
                    onClick={() => handleDone(stockIn)}
                    className="flex-1 h-7 rounded-lg text-[11px] border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800 disabled:opacity-40"
                  >
                    {doneBusy ? "Processing…" : "Mark as Done"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={anyBusy}
                    onClick={() => handleCancel(stockIn)}
                    className="flex-1 h-7 rounded-lg text-[11px] border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    {cancelBusy ? "Processing…" : "Cancel"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
