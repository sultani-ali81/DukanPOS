import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CloseSession, openSession } from "@/queries/session";
import type {
  CloseSessionResponse,
  OpenSessionResponse,
} from "@/types/session";
import { Loader2, Lock, Unlock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ── Open Session Dialog ───────────────────────────────────────────────────────

interface OpenSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (res: OpenSessionResponse) => void;
}

export function OpenSessionDialog({
  open,
  onOpenChange,
  onSuccess,
}: OpenSessionDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const openingAmount = parseFloat(amount);
    if (isNaN(openingAmount) || openingAmount < 0) {
      toast.error("Enter a valid opening amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await openSession({
        openingAmount,
        note: note.trim() || undefined,
      });
      toast.success(res.message ?? "Session opened");
      onSuccess?.(res);
      onOpenChange(false);
      setAmount("");
      setNote("");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to open session";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
              <Unlock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                Open Session
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Enter the opening cash amount
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Opening Amount (AFN)
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

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Morning shift"
              className="rounded-xl border-gray-200 text-sm resize-none h-20"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Open Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Close Session Dialog ──────────────────────────────────────────────────────

interface CloseSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (res: CloseSessionResponse) => void;
}

export function CloseSessionDialog({
  open,
  onOpenChange,
  onSuccess,
}: CloseSessionDialogProps) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CloseSessionResponse | null>(null);

  const handleSubmit = async () => {
    const closingAmount = parseFloat(amount);
    if (isNaN(closingAmount) || closingAmount < 0) {
      toast.error("Enter a valid closing amount");
      return;
    }
    setSubmitting(true);
    try {
      const res = await CloseSession({
        closingAmount,
        note: note.trim() || undefined,
      });
      setResult(res);
      onSuccess?.(res);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to close session";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setAmount("");
    setNote("");
    setResult(null);
  };

  // ── Summary view after successful close ──────────────────────────────────────
  if (result) {
    const closing = parseFloat(amount);
    const diff = closing - result.expectedAmount;
    const diffColor =
      diff > 0 ? "text-green-600" : diff < 0 ? "text-red-500" : "text-gray-700";

    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-red-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-gray-900">
                  Session Closed
                </DialogTitle>
                <p className="text-xs text-gray-400 mt-0.5">{result.message}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 py-4 space-y-3">
            <div className="rounded-xl bg-gray-50 divide-y divide-gray-100">
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-gray-500">Expected Amount</span>
                <span className="font-semibold text-gray-800">
                  {result.expectedAmount.toFixed(2)} AFN
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-gray-500">Closing Amount</span>
                <span className="font-semibold text-gray-800">
                  {closing.toFixed(2)} AFN
                </span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 text-sm">
                <span className="text-gray-500">Difference</span>
                <span className={`font-bold ${diffColor}`}>
                  {diff >= 0 ? "+" : ""}
                  {diff.toFixed(2)} AFN
                </span>
              </div>
            </div>
          </div>

          <div className="px-5 pb-5">
            <Button
              className="w-full h-11 rounded-xl bg-black hover:bg-black/90 text-white text-sm font-semibold"
              onClick={handleClose}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // ── Input view ────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
        <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-gray-900">
                Close Session
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Count your cash and enter the closing amount
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Closing Amount (AFN)
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

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">
              Note <span className="text-gray-400 font-normal">(optional)</span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Evening shift end"
              className="rounded-xl border-gray-200 text-sm resize-none h-20"
            />
          </div>
        </div>

        <div className="px-5 pb-5 flex gap-2">
          <Button
            variant="outline"
            className="flex-1 h-11 rounded-xl border-gray-200 text-sm"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Close Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
