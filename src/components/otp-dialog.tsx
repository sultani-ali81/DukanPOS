import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useState } from "react";

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onVerify: (code: string) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function OtpDialog({
  open,
  onClose,
  title,
  description,
  onVerify,
}: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await onVerify(code); // parent handles API — keeps this component generic
      setCode("");
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        Array.isArray(msg) ? msg[0] : msg || "Invalid code. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCode("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm rounded-2xl p-6">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-base font-semibold text-center">
            {title}
          </DialogTitle>
          <p className="text-xs text-gray-400 text-center">{description}</p>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          {/* shadcn OTP input — 6 boxes */}
          <InputOTP maxLength={6} value={code} onChange={setCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>

          {error && <p className="text-red-500 text-xs">{error}</p>}

          <Button
            variant="default"
            className="w-full h-11"
            onClick={handleVerify}
            disabled={loading || code.length < 6}
          >
            {loading ? "Verifying..." : "Verify"}
          </Button>

          <button
            onClick={handleClose}
            className="w-full text-xs text-gray-400 hover:text-gray-600 transition"
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
