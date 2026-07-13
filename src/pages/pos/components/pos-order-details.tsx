import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/data";
import type { SalePaymentStatus } from "@/types/sale";
import {
  Banknote,
  Clock3,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { PosCustomerCombobox } from "./pos-customer-combobox";
import { PosInventoryCombobox } from "./pos-inventory-combobox";
import type { PosCartItem } from "./use-pos-order";

interface PosOrderDetailsProps {
  inventoryId: string;
  inventoryLabel: string;
  onInventoryChange: (id: string, name: string) => void;
  customerId: string;
  customerLabel: string;
  onCustomerChange: (id: string, name: string) => void;
  cart: PosCartItem[];
  onUpdateQuantity: (productId: string, delta: number) => void;
  onSetQuantity: (productId: string, value: number) => void;
  onRemoveItem: (productId: string) => void;
  subtotal: number;
  tax: number;
  total: number;
  paymentStatus: SalePaymentStatus;
  onPaymentStatusChange: (status: SalePaymentStatus) => void;
  partialPaymentAmount: string;
  onPartialPaymentAmountChange: (amount: string) => void;
  partialPaymentError: string | null;
  amountDueNow: number;
  hasActiveSession: boolean;
  checkingSession: boolean;
  onOpenSession: () => void;
  submitting: boolean;
  onPay: () => Promise<boolean>;
}

// ── Editable quantity cell ────────────────────────────────────────────────────
// - Always an input, never toggled
// - Fully erasable: when empty shows placeholder "0", immediately calls
//   onSetQuantity(0) so the product card badge and totals update in real time
// - Commits final value on blur / Enter; Escape restores previous value
// - Clamps to stock on commit

function QuantityInput({
  item,
  onUpdateQuantity,
  onSetQuantity,
}: {
  item: PosCartItem;
  onUpdateQuantity: (id: string, delta: number) => void;
  onSetQuantity: (id: string, value: number) => void;
}) {
  const [raw, setRaw] = useState(String(item.quantity));
  const [focused, setFocused] = useState(false);

  // Only sync externally (e.g. + / - button) when the user is NOT inside the field
  if (!focused && raw !== "" && Number(raw) !== item.quantity) {
    setRaw(String(item.quantity));
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only update local display — never touch the cart while the user is typing
    const val = e.target.value.replace(/[^0-9]/g, "");
    if (val === "") {
      setRaw("");
      return;
    }
    const n = parseInt(val, 10);
    // Clamp to stock — can't type more than available
    if (n > item.stock) {
      toast.warning(`Only ${item.stock} in stock`);
      setRaw(String(item.stock));
    } else {
      setRaw(val);
    }
  };

  const commit = () => {
    const n = raw === "" ? 0 : parseInt(raw, 10);
    const clamped = isNaN(n) ? item.quantity : Math.min(n, item.stock);
    if (clamped !== item.quantity) {
      onSetQuantity(item.id, clamped);
    }
    // Reflect the committed value — if 0 or empty, show empty (placeholder shows "0")
    setRaw(clamped <= 0 ? "" : String(clamped));
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      {/* − */}
      <button
        onClick={() => {
          onUpdateQuantity(item.id, -1);
          setRaw(String(Math.max(0, item.quantity - 1)));
        }}
        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors"
      >
        <Minus className="w-3 h-3 text-gray-600" />
      </button>

      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={raw}
        placeholder="0"
        onChange={handleChange}
        onFocus={(e) => {
          setFocused(true);
          e.target.select();
        }}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setRaw(String(item.quantity));
            e.currentTarget.blur();
          }
        }}
        className="w-12 h-7 text-center text-sm font-semibold text-gray-800 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-colors"
      />

      {/* + */}
      <button
        onClick={() => {
          onUpdateQuantity(item.id, 1);
          setRaw(String(Math.min(item.stock, item.quantity + 1)));
        }}
        disabled={item.quantity >= item.stock}
        className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-green-50 hover:border-green-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:border-gray-200"
      >
        <Plus className="w-3 h-3 text-gray-600" />
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function PosOrderDetails({
  inventoryId,
  inventoryLabel,
  onInventoryChange,
  customerId,
  customerLabel,
  onCustomerChange,
  cart,
  onUpdateQuantity,
  onSetQuantity,
  onRemoveItem,
  subtotal,
  tax,
  total,
  paymentStatus,
  onPaymentStatusChange,
  partialPaymentAmount,
  onPartialPaymentAmountChange,
  partialPaymentError,
  amountDueNow,
  hasActiveSession,
  checkingSession,
  onOpenSession,
  submitting,
  onPay,
}: PosOrderDetailsProps) {
  const paymentGroupName = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const totalItems = cart.reduce((s, i) => s + i.quantity, 0);
  const canPay =
    cart.length > 0 &&
    cart.every(
      (item) =>
        item.quantity > 0 &&
        item.quantity <= item.stock &&
        Number.isFinite(item.price) &&
        item.price >= 0,
    ) &&
    !!customerId &&
    !!inventoryId &&
    hasActiveSession &&
    !checkingSession &&
    !partialPaymentError;

  const paymentLabel =
    paymentStatus === "fully_paid"
      ? "Fully paid"
      : paymentStatus === "partially_paid"
        ? "Partially paid"
        : "Unpaid";

  const actionLabel =
    paymentStatus === "fully_paid"
      ? `Pay ${formatCurrency(total)}`
      : paymentStatus === "partially_paid"
        ? `Receive ${formatCurrency(amountDueNow)}`
        : "Complete as unpaid";

  return (
    <div className="flex flex-col h-full p-4 gap-3">
      {/* Header — desktop only */}
      <div className="hidden lg:flex items-center justify-between shrink-0">
        <h2 className="text-base font-semibold text-gray-900">Order Details</h2>
        {totalItems > 0 && (
          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {totalItems} items
          </span>
        )}
      </div>

      {/* Inventory combobox — hidden on mobile (shown above product grid instead) */}
      <div className="hidden lg:block shrink-0">
        <PosInventoryCombobox
          value={inventoryId}
          label={inventoryLabel}
          onChange={onInventoryChange}
        />
      </div>

      {/* Customer combobox */}
      <div className="shrink-0">
        <PosCustomerCombobox
          value={customerId}
          label={customerLabel}
          onChange={onCustomerChange}
        />
      </div>

      <div className="border-t border-gray-100 shrink-0" />

      {/* Cart items */}
      <div className="lg:flex-1 lg:overflow-y-auto lg:min-h-0 space-y-2">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <ShoppingCart className="w-10 h-10 text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">No items yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Tap a product to add it
            </p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100/70 transition-colors"
            >
              {/* Image */}
              {item.image ? (
                <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-11 h-11 rounded-lg shrink-0 bg-gray-200" />
              )}

              {/* Name + price */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatCurrency(item.price)} ={" "}
                  <span className="font-semibold text-gray-700">
                    {formatCurrency(item.price * item.quantity)}
                  </span>
                </p>
              </div>

              {/* Qty controls — click number to type */}
              <QuantityInput
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onSetQuantity={onSetQuantity}
              />

              {/* Remove */}
              <button
                onClick={() => onRemoveItem(item.id)}
                className="w-7 h-7 shrink-0 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Totals + Pay */}
      {cart.length > 0 && (
        <div className="shrink-0 space-y-2 border-t border-gray-100 pt-3 mt-auto">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Subtotal</span>
            <span className="font-medium text-gray-700">
              {formatCurrency(subtotal)}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span
              className="text-gray-400"
              title="10% tax, rounded on each item"
            >
              Tax (rounded)
            </span>
            <span className="font-medium text-gray-700">
              {formatCurrency(tax)}
            </span>
          </div>
          <div className="flex items-center justify-between text-base font-semibold">
            <span className="text-gray-900">Total</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>

          <fieldset className="space-y-2 pt-1">
            <legend className="text-xs font-semibold text-gray-700 mb-2">
              Payment
            </legend>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ["fully_paid", "Full", CreditCard],
                  ["partially_paid", "Partial", Banknote],
                  ["unpaid", "Unpaid", Clock3],
                ] as const
              ).map(([status, label, Icon]) => {
                const selected = paymentStatus === status;
                return (
                  <label
                    key={status}
                    className={`cursor-pointer rounded-xl border px-2 py-2 text-center transition-colors ${
                      selected
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name={paymentGroupName}
                      value={status}
                      checked={selected}
                      onChange={() => onPaymentStatusChange(status)}
                    />
                    <Icon className="mx-auto mb-1 h-4 w-4" />
                    <span className="block text-[11px] font-semibold">
                      {label}
                    </span>
                  </label>
                );
              })}
            </div>

            {paymentStatus === "partially_paid" && (
              <div className="space-y-1">
                <label
                  htmlFor={`${paymentGroupName}-amount`}
                  className="text-xs font-medium text-gray-600"
                >
                  Amount received now
                </label>
                <div className="relative">
                  <Input
                    id={`${paymentGroupName}-amount`}
                    value={partialPaymentAmount}
                    onChange={(event) =>
                      onPartialPaymentAmountChange(event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="0.00"
                    aria-invalid={Boolean(partialPaymentError)}
                    className="h-10 rounded-xl pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    AFN
                  </span>
                </div>
                {partialPaymentError ? (
                  <p className="text-xs text-red-600" role="alert">
                    {partialPaymentError}
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Remaining after checkout:{" "}
                    {formatCurrency(Math.max(0, total - amountDueNow))}
                  </p>
                )}
              </div>
            )}
          </fieldset>

          {!checkingSession && !hasActiveSession && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs text-amber-800">
                Open a session before checkout.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenSession}
                className="h-8 shrink-0 border-amber-300 bg-white text-xs text-amber-800"
              >
                Open session
              </Button>
            </div>
          )}
          {checkingSession && (
            <p className="flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Checking active session…
            </p>
          )}

          {/* ── Confirmation dialog ── */}
          <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!canPay || submitting}
                className="w-full h-12 rounded-xl text-sm font-semibold mt-1 flex items-center gap-2"
                variant="default"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {submitting ? "Processing…" : actionLabel}
              </Button>
            </AlertDialogTrigger>

            <AlertDialogContent className="rounded-2xl max-w-sm p-0 overflow-hidden gap-0">
              {/* Header */}
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <AlertDialogTitle className="text-base font-semibold text-gray-900">
                  Confirm Sale
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs text-gray-400 mt-0.5">
                  {customerLabel} · {inventoryLabel}
                </AlertDialogDescription>
              </div>

              {/* Items */}
              <div className="px-5 py-3 max-h-48 overflow-y-auto space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5 shrink-0">
                        ×{item.quantity}
                      </span>
                      <span className="text-sm text-gray-700 truncate">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 shrink-0">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="px-5 py-3 bg-gray-50 space-y-1.5 border-t border-gray-100">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500">
                  <span title="10% tax, rounded on each item">
                    Tax (rounded)
                  </span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1 border-t border-gray-200">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 pt-1">
                  <span>Payment</span>
                  <span className="font-medium">{paymentLabel}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Received now</span>
                  <span className="font-semibold">
                    {formatCurrency(amountDueNow)}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-4 flex items-center gap-2  border-t border-gray-100">
                <AlertDialogCancel className="flex-1 h-11 rounded-xl border-gray-200 text-sm font-medium">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={submitting}
                  onClick={(event) => {
                    event.preventDefault();
                    void onPay().then((success) => {
                      if (success) setConfirmOpen(false);
                    });
                  }}
                  className="flex-1 h-11 rounded-xl bg-black text-white hover:bg-black/90 text-sm font-semibold"
                >
                  {submitting ? "Processing…" : "Complete sale"}
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
