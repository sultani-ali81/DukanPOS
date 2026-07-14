import {
  CompactDialogBody,
  CompactDialogContent,
  CompactDialogFooter,
  CompactDialogHeader,
} from "@/components/compact-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { extractError } from "@/lib/error";
import { cn } from "@/lib/utils";
import { createCashMovement } from "@/queries/cash-movement";
import type { CashMovementPayload } from "@/types/cash-movement";
import { ArrowDownLeft, ArrowUpRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PosCashMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type MovementType = "cash_in" | "cash_out";

export function PosCashMovementDialog({
  open,
  onOpenChange,
  onSuccess,
}: PosCashMovementDialogProps) {
  const [type, setType] = useState<MovementType>("cash_in");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    onOpenChange(false);
    setAmount("");
    setNote("");
    setType("cash_in");
  };

  const handleSubmit = async () => {
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) {
      toast.error("Enter a valid amount greater than 0");
      return;
    }

    setSubmitting(true);
    try {
      const payload: CashMovementPayload = {
        type,
        amount: parsed,
        note: note.trim() || undefined,
      };
      const res = await createCashMovement(payload);
      toast.success(res.message ?? "Cash movement recorded");
      onSuccess?.();
      handleClose();
    } catch (err: unknown) {
      toast.error(extractError(err, "Failed to record cash movement"));
    } finally {
      setSubmitting(false);
    }
  };

  const isCashIn = type === "cash_in";

  const typeConfig = {
    cash_in: {
      icon: ArrowDownLeft,
      iconBg: "bg-green-50",
      iconColor: "text-green-600",
      activeBg: "bg-green-50 border-green-200 text-green-700",
      inactiveBg:
        "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50",
      label: "Cash In",
      subtitle: "Add cash to the drawer",
      confirmLabel: "Record Cash In",
    },
    cash_out: {
      icon: ArrowUpRight,
      iconBg: "bg-orange-50",
      iconColor: "text-orange-500",
      activeBg: "bg-orange-50 border-orange-200 text-orange-600",
      inactiveBg:
        "bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50",
      label: "Cash Out",
      subtitle: "Remove cash from the drawer",
      confirmLabel: "Record Cash Out",
    },
  };

  const active = typeConfig[type];
  const ActiveIcon = active.icon;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <CompactDialogContent>
        {/* Header */}
        <CompactDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                active.iconBg,
              )}
            >
              <ActiveIcon className={cn("w-4 h-4", active.iconColor)} />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                Cash Movement
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">{active.subtitle}</p>
            </div>
          </div>
        </CompactDialogHeader>

        {/* Body */}
        <CompactDialogBody>
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            {(["cash_in", "cash_out"] as MovementType[]).map((t) => {
              const cfg = typeConfig[t];
              const Icon = cfg.icon;
              const isActive = type === t;
              return (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex items-center gap-2 h-10 px-3 rounded-xl border text-sm font-medium transition-colors",
                    isActive ? cfg.activeBg : cfg.inactiveBg,
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Amount (AFN)
            </Label>
            <Input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="h-11 rounded-xl border-gray-200 text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                isCashIn ? "e.g. Extra float added" : "e.g. Petty cash expense"
              }
              className="rounded-xl border-gray-200 text-sm resize-none h-20"
            />
          </div>
        </CompactDialogBody>

        {/* Footer */}
        <CompactDialogFooter>
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl text-sm font-semibold"
            variant="default"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {active.confirmLabel}
          </Button>
        </CompactDialogFooter>
      </CompactDialogContent>
    </Dialog>
  );
}
