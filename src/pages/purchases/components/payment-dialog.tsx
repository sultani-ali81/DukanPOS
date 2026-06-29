import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { CheckCircle } from "lucide-react";

import { updatePurchaseStatus } from "@/queries/purchase";
import type { PaymentMethod, PurchaseDetail } from "@/types/purchases";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(n: number) {
  return "AFN " + Number(n).toLocaleString("id-ID");
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAYMENT_METHODS: PaymentMethod[] = [
  "Cash",
  "Bank Transfer",
  "Cheque",
  "Other",
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentForm {
  method: PaymentMethod;
  amount: string;
  paymentDate: string;
  notes: string;
}

function defaultPaymentForm(totalPrice: number): PaymentForm {
  return {
    method: "Cash",
    amount: String(totalPrice),
    paymentDate: todayISO(),
    notes: "",
  };
}

export interface PaymentDialogProps {
  purchase: PurchaseDetail;
  onSuccess: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PaymentDialog({ purchase, onSuccess }: PaymentDialogProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(
    defaultPaymentForm(purchase.totalPrice),
  );
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next) {
      setForm(defaultPaymentForm(purchase.totalPrice));
      setError(null);
    }
  };

  const handleConfirm = async () => {
    const amount = parseFloat(form.amount);

    if (!form.method) {
      setError("Please select a payment method.");
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }
    if (!form.paymentDate) {
      setError("Please select a payment date.");
      return;
    }

    setError(null);
    setConfirming(true);

    try {
      await updatePurchaseStatus(purchase.id, { status: "Done" });

      setOpen(false);
      onSuccess();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm purchase.",
      );
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          className="h-9 rounded-xl bg-green-600 hover:bg-green-700 text-white gap-1.5 text-xs"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Confirm Purchase
        </Button>
      </DialogTrigger>

      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>
            Record payment for{" "}
            <span className="font-mono font-medium">
              #{purchase.sequenceId}
            </span>
            . This will mark the purchase as{" "}
            <span className="text-green-600 font-medium">Done</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Payment method */}
          <div className="space-y-1.5">
            <Label>Payment Method</Label>
            <Select
              value={form.method}
              onValueChange={(v) =>
                setForm((f) => ({ ...f, method: v as PaymentMethod }))
              }
            >
              <SelectTrigger aria-label="Payment Method" className="rounded-xl">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (AFN)</Label>
            <Input
              id="amount"
              type="number"
              min={0}
              step="0.01"
              className="rounded-xl"
              value={form.amount}
              onChange={(e) =>
                setForm((f) => ({ ...f, amount: e.target.value }))
              }
            />
            <p className="text-[11px] text-gray-400">
              Purchase total: {fmtCurrency(purchase.totalPrice)}
            </p>
          </div>

          {/* Inline error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => setOpen(false)}
            disabled={confirming}
          >
            Cancel
          </Button>
          <Button
            className="rounded-xl bg-green-600 hover:bg-green-700 text-white"
            onClick={handleConfirm}
            disabled={confirming}
          >
            {confirming ? "Confirming…" : "Confirm & Mark as Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
