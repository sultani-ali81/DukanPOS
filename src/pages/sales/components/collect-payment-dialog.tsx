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
import { usePosSession } from "@/pages/pos/components/use-pos-session";
import { addSalePayment } from "@/queries/sale";
import type { SaleDetail, SalePaymentStatus } from "@/types/sale";
import { AlertCircle, Loader2, WalletCards } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { canCollectSalePayment } from "../sales-utils";
import { SalePaymentStatusBadge } from "./sale-badges";

export interface CollectPaymentDialogProps {
  sale: SaleDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function hasAtMostTwoDecimalPlaces(value: string): boolean {
  return /^(?:\d+|\d*\.\d{1,2})$/.test(value.trim());
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function determinePaymentStatus(
  amount: number,
  remainingBalance: number,
): Exclude<SalePaymentStatus, "unpaid"> {
  return roundMoney(amount) === roundMoney(remainingBalance)
    ? "fully_paid"
    : "partially_paid";
}

export function CollectPaymentDialog({
  sale,
  open,
  onOpenChange,
}: CollectPaymentDialogProps) {
  const navigate = useNavigate();
  const { mutate } = useSWRConfig();
  const { hasActiveSession, checkingSession } = usePosSession();
  const amountId = useId();
  const errorId = useId();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const canCollect = canCollectSalePayment(sale);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!submitting) onOpenChange(nextOpen);
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    if (!canCollect) {
      setError("This sale cannot receive another payment.");
      return;
    }
    if (checkingSession) return;
    if (!hasActiveSession) {
      setError("No active session found. Please open a session first.");
      return;
    }
    const trimmedAmount = amount.trim();
    if (!trimmedAmount) {
      setError("Payment amount is required.");
      return;
    }

    const numericAmount = Number(trimmedAmount);
    if (!Number.isFinite(numericAmount)) {
      setError("Payment amount must be a valid number.");
      return;
    }
    if (numericAmount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }
    if (!hasAtMostTwoDecimalPlaces(trimmedAmount)) {
      setError("Payment amount cannot have more than two decimal places.");
      return;
    }

    const roundedAmount = roundMoney(numericAmount);
    const roundedRemainingBalance = roundMoney(sale.remainingBalance);
    if (roundedAmount > roundedRemainingBalance) {
      setError("Payment amount cannot exceed the remaining balance.");
      return;
    }

    const paymentStatus = determinePaymentStatus(
      roundedAmount,
      roundedRemainingBalance,
    );

    submittingRef.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await addSalePayment(sale.id, {
        amount: roundedAmount,
        paymentStatus,
      });

      onOpenChange(false);
      toast.success("Payment collected", {
        description:
          result.message || `Payment recorded for ${sale.sequenceId}.`,
      });

      await mutate(
        (key) =>
          (typeof key === "string" &&
            (key.startsWith("/sales?") || key === `/sales/${sale.id}`)) ||
          (Array.isArray(key) && key[0] === "dashboard"),
        undefined,
        { revalidate: true },
      );
    } catch (requestError: unknown) {
      setError(
        extractError(requestError, "Could not collect payment. Try again."),
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
            <WalletCards className="size-5 text-primary" />
            Collect payment
          </DialogTitle>
          <DialogDescription>
            Record another payment for sale {sale.sequenceId}. The backend will
            validate it against the sale&apos;s current balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Sale total
              </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(sale.totalPrice)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Remaining balance
              </span>
              <span className="font-semibold tabular-nums">
                {formatCurrency(sale.remainingBalance)}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">
                Current status
              </span>
              <SalePaymentStatusBadge status={sale.paymentStatus} />
            </div>
          </div>

          {checkingSession ? (
            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Checking active session…
            </div>
          ) : !hasActiveSession ? (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
              <div className="flex gap-2 text-sm">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <div>
                  <p className="font-medium">An active session is required.</p>
                  <p className="mt-1 text-xs text-amber-800">
                    Open your POS session before collecting this payment.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3 border-amber-400 bg-white"
                onClick={() => navigate("/pos")}
              >
                Go to POS
              </Button>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <Label htmlFor={amountId}>Payment amount (AFN)</Label>
            <Input
              id={amountId}
              type="number"
              inputMode="decimal"
              min="0.01"
              max={sale.remainingBalance}
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
              disabled={
                submitting ||
                checkingSession ||
                !hasActiveSession ||
                !canCollect
              }
            />
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            Enter up to {formatCurrency(sale.remainingBalance)}. A payment for
            the full remaining balance will automatically mark the sale as
            fully paid.
          </p>

          {error && (
            <div
              id={errorId}
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
            >
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={
              submitting ||
              checkingSession ||
              !hasActiveSession ||
              !canCollect
            }
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
