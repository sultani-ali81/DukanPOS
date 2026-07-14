import OtpDialog from "@/components/otp-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/lib/store";
import { disable2FA, enable2FA, verify2FASetup } from "@/queries/auth";
import { Loader2, ShieldCheck, ShieldOff, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Enable2FAResponse {
  qrCode: string;
}

export function TwoFactorCard() {
  const { twoFAEnabled, setTwoFAEnabled } = useAuthStore();

  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [otpOpen, setOtpOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [loading, setLoading] = useState(false);

  // ── Enable: fetch QR then open dialog ────────────────────────────────────

  async function handleEnable() {
    setLoading(true);
    try {
      const res = await enable2FA();
      const data = res.data as Enable2FAResponse;
      setQrCode(data.qrCode);
      setQrDialogOpen(true);
    } catch {
      toast.error("Could not start 2FA setup. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleQrDialogClose() {
    setQrDialogOpen(false);
    setQrCode("");
  }

  // ── Verify code ───────────────────────────────────────────────────────────

  async function handleVerify(code: string) {
    await verify2FASetup(code);
    setTwoFAEnabled(true);
    setOtpOpen(false);
    setQrDialogOpen(false);
    setQrCode("");
    toast.success("Two-factor authentication enabled", {
      description: "Your account is now more secure.",
    });
  }

  // ── Disable ───────────────────────────────────────────────────────────────

  async function handleDisable() {
    setLoading(true);
    try {
      await disable2FA();
      setTwoFAEnabled(false);
      toast.success("Two-factor authentication disabled");
    } catch {
      toast.error("Could not disable 2FA. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── The card — never changes shape ── */}
      <Card size="sm" className="h-fit self-start">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-3">
            <span>Two-Factor Authentication</span>
            <Badge
              variant={twoFAEnabled ? "default" : "secondary"}
              className={
                twoFAEnabled
                  ? "bg-green-100 text-green-700 hover:bg-green-100 font-normal border-0"
                  : "font-normal"
              }
            >
              {twoFAEnabled ? "Enabled" : "Disabled"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {twoFAEnabled ? (
            <>
              <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-600" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium text-green-800">
                    Your account is protected
                  </p>
                  <p className="text-xs text-green-700">
                    A code from your authenticator app is required each time you
                    sign in.
                  </p>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-full border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <ShieldOff className="size-4" />
                    )}
                    Disable Two-Factor Authentication
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                  <AlertDialogTitle>Disable 2FA?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your account will only be protected by your password. You
                    can re-enable 2FA at any time.
                  </AlertDialogDescription>
                  <div className="flex gap-2 pt-1">
                    <AlertDialogCancel className="flex-1">
                      Keep Enabled
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDisable}
                      className="flex-1 bg-destructive text-white hover:bg-destructive/90"
                    >
                      Yes, Disable
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
                <ShieldOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">
                    Add an extra layer of security
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Require a time-based code from an authenticator app on every
                    sign-in.
                  </p>
                </div>
              </div>

              <Button
                className="h-10 w-full"
                onClick={handleEnable}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4" />
                )}
                Enable Two-Factor Authentication
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── QR code dialog — separate from the card ── */}
      <Dialog
        open={qrDialogOpen}
        onOpenChange={(o) => !o && handleQrDialogClose()}
      >
        <DialogContent className="max-w-sm rounded-2xl p-0 overflow-hidden gap-0">
          <DialogHeader className="px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base font-semibold">
                  Scan QR Code
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Use Google Authenticator or Authy
                </p>
              </div>
              <button
                onClick={handleQrDialogClose}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </DialogHeader>

          <div className="px-5 py-5 space-y-5">
            <p className="text-sm text-muted-foreground">
              Scan the QR code with your authenticator app, then click{" "}
              <span className="font-medium text-foreground">Verify</span> and
              enter the 6‑digit code to complete setup.
            </p>

            <div className="flex justify-center">
              <div className="rounded-xl border bg-white p-3 shadow-sm">
                <img
                  src={qrCode}
                  alt="2FA QR code"
                  className="h-44 w-44 object-contain"
                />
              </div>
            </div>
          </div>

          <div className="px-5 pb-5 flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl border-gray-200"
              onClick={handleQrDialogClose}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 h-11 rounded-xl"
              onClick={() => setOtpOpen(true)}
            >
              I've scanned it — Verify
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── OTP verification dialog ── */}
      <OtpDialog
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Verify Authenticator"
        description="Enter the 6-digit code from your authenticator app."
        onVerify={handleVerify}
      />
    </>
  );
}
