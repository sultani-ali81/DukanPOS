import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/currency";
import { extractError } from "@/lib/error";
import {
  canAddPurchasePayment,
  paymentStatusForInstallment,
  roundMoney,
} from "@/pages/purchases/purchase-utils";
import { addPurchasePayment } from "@/queries/purchase";
import { hasSession } from "@/queries/session";
import type { PurchaseDetail } from "@/types/purchases";
import { AlertCircle, Loader2, WalletCards } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";

export interface PaymentDialogProps {
  purchase: PurchaseDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Refetch the detail; its remaining balance is the source of truth. */
  onSuccess: () => Promise<unknown> | unknown;
}

function hasAtMostTwoDecimalPlaces(value: string): boolean {
  return /^(?:\d+|\d*\.\d{1,2})$/.test(value.trim());
}

export function PaymentDialog({
  purchase,
  open,
  onOpenChange,
  onSuccess,
}: PaymentDialogProps) {
  const amountId = useId();
  const errorId = useId();
  const submittingRef = useRef(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canAddPayment = canAddPurchasePayment(purchase);
  const remainingBalance = roundMoney(purchase.remainingBalance);

  const handleOpenChange = (nextOpen: boolean) => {
    if (submitting) return;
    if (nextOpen) {
      setAmount("");
      setError(null);
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!canAddPayment) {
      setError("This purchase cannot receive another payment.");
      return;
    }

    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setError("Payment amount is required.");
      return;
    }
    if (!hasAtMostTwoDecimalPlaces(trimmedAmount)) {
      setError("Payment amount cannot have more than two decimal places.");
      return;
    }

    const numericAmount = Number(trimmedAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    const roundedAmount = roundMoney(numericAmount);
    if (roundedAmount > remainingBalance) {
      setError("Payment amount cannot exceed the remaining balance.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const activeSession = await hasSession();
      if (!activeSession) {
        setError("Open a store session before recording a purchase payment.");
        return;
      }

      const paymentStatus = paymentStatusForInstallment(
        roundedAmount,
        remainingBalance,
      );
      const result = await addPurchasePayment(purchase.id, {
        amount: roundedAmount,
        paymentStatus,
      });

      await onSuccess();
      toast.success("Payment recorded", {
        description: result.message || `Payment recorded for ${purchase.sequenceId}.`,
      });
      onOpenChange(false);
    } catch (requestError: unknown) {
      setError(
        extractError(requestError, "Could not record the purchase payment."),
      );
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <WalletCards className="size-5 text-primary" /> Add payment
          </DialogTitle>
          <DialogDescription>
            Record a new installment for purchase {purchase.sequenceId}. The
            amount is added to the current balance; it is not the total paid.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Purchase total</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(purchase.totalPrice)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Remaining balance</span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(remainingBalance)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor={amountId}>Payment amount (AFN)</Label>
            <Input
              id={amountId}
              type="number"
              inputMode="decimal"
              min="0.01"
              max={remainingBalance}
              step="0.01"
              autoFocus
              value={amount}
              onChange={(event) => {
                setAmount(event.target.value);
                setError(null);
              }}
              placeholder="0.00"
              aria-invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
              disabled={submitting || !canAddPayment}
            />
            <p className="text-xs text-muted-foreground">
              Paying the full remaining balance marks this purchase as fully paid.
            </p>
          </div>

          {error && (
            <div
              id={errorId}
              role="alert"
              className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !canAddPayment}
          >
            {submitting ? (
              <>
                <Loader2 className="animate-spin" /> Recording…
              </>
            ) : (
              "Record payment"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
