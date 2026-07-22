import { AuthInput } from "@/components/layout/auth-input";
import AuthLayout from "@/components/layout/auth-layout";
import OtpDialog from "@/components/otp-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractError } from "@/lib/error";
import { passwordSchema } from "@/lib/password";
import {
  forgotPassword,
  setNewPassword,
  verifyResetCode,
} from "@/queries/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpOpen, setOtpOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim();
    if (!normalizedEmail) return setError("Please enter your email");

    try {
      setLoading(true);
      await forgotPassword(normalizedEmail);
      setEmail(normalizedEmail);
      setOtpOpen(true);
    } catch (err: unknown) {
      setError(extractError(err, "Unable to send the reset code"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (code: string) => {
    const result = await verifyResetCode({ email, code });
    setResetToken(result.resetToken);
    setPasswordOpen(true);
  };

  const handleSetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError("");

    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      return setPasswordError(passwordResult.error.issues[0].message);
    }
    if (password !== confirmPassword) {
      return setPasswordError("Passwords do not match");
    }

    try {
      setSavingPassword(true);
      await setNewPassword({ resetToken, newPassword: password });
      setPasswordOpen(false);
      navigate("/login", { replace: true });
    } catch (err: unknown) {
      setPasswordError(extractError(err, "Unable to reset your password"));
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <>
      <AuthLayout
        panel={
          <>
            <h2 className="text-3xl font-bold">Hello, Friend!</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Don't have an Account?
            </p>
            <p className="text-sm leading-relaxed text-white/80">
              Create an Account and start managing your Store today.
            </p>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="mt-8 cursor-pointer rounded-full border-1 border-white px-12 py-3 text-sm font-semibold uppercase tracking-wide text-white transition hover:bg-blue-900 hover:text-primary"
            >
              Sign Up
            </button>
          </>
        }
      >
        <div className="w-full max-w-sm">
          <h1 className="text-center text-3xl font-bold text-primary">
            Forgot Password
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Enter your email and we’ll send you a verification code
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <AuthInput
              icon={Mail}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            {error && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <Button
                type="submit"
                disabled={loading}
                className="h-12 rounded-full bg-primary/90 px-12 text-sm font-semibold uppercase tracking-wide text-white hover:bg-primary"
              >
                {loading ? "Sending..." : "Send Reset Code"}
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500">
            Remember your password?{" "}
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="cursor-pointer font-semibold text-teal-600 hover:underline"
            >
              Sign In
            </button>
          </div>

          <div className="mt-3 text-center text-sm text-slate-500 lg:hidden">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="cursor-pointer font-semibold text-teal-600 hover:underline"
            >
              Create Account
            </button>
          </div>
        </div>
      </AuthLayout>

      <OtpDialog
        open={otpOpen}
        onClose={() => setOtpOpen(false)}
        title="Verify Reset Code"
        description={`Enter the 6-digit code sent to ${email}`}
        onVerify={handleVerify}
      />

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-6">
          <DialogHeader className="text-center">
            <DialogTitle className="text-center text-lg font-semibold">
              Set New Password
            </DialogTitle>
            <DialogDescription className="text-center">
              Choose a secure new password for your account.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSetPassword} className="space-y-4">
            <AuthInput
              icon={Lock}
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="New Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              }
            />
            <AuthInput
              icon={Lock}
              type={showConfirmPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </Button>
              }
            />

            {passwordError && (
              <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                {passwordError}
              </div>
            )}

            <Button
              type="submit"
              disabled={savingPassword}
              className="h-11 w-full"
            >
              {savingPassword ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
