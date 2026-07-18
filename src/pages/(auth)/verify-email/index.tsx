import AuthLayout from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { extractError } from "@/lib/error";
import {
  clearPendingRegistrationEmail,
  getPendingRegistrationEmail,
} from "@/lib/pending-registration";
import { useAuthStore } from "@/lib/store";
import { decodeToken } from "@/lib/utils";
import { verifyRegister } from "@/queries/auth";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface VerifyEmailLocationState {
  email?: string;
}

interface RegistrationTokenPayload {
  id?: string;
  email?: string;
  role?: string;
}

export default function VerifyEmailPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const routeEmail = (location.state as VerifyEmailLocationState | null)?.email;
  const email = routeEmail?.trim() || getPendingRegistrationEmail().trim();

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || code.length !== 6 || loading) return;

    setError("");
    setLoading(true);

    try {
      const response = await verifyRegister({ email, code });
      const decoded = decodeToken<RegistrationTokenPayload>(response.token);

      if (
        !decoded ||
        (decoded.role !== "Admin" && decoded.role !== "Cashier")
      ) {
        throw new Error("The verification token is invalid.");
      }

      setAuth(
        {
          // Registration tokens identify the user with `sub`; the profile
          // request will provide the employee ID after authentication.
          id: decoded.id || "",
          email: decoded.email || email,
          role: decoded.role,
        },
        response.token,
      );
      clearPendingRegistrationEmail();
      toast.success("Email verified", {
        description: "Your account is ready to use.",
      });
      navigate(decoded.role === "Cashier" ? "/pos" : "/dashboard", {
        replace: true,
      });
    } catch (err: unknown) {
      setError(extractError(err, "Email verification failed"));
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <AuthLayout
        reverse
        panel={
          <>
            <MailCheck className="mx-auto size-12 text-white/90" />
            <h2 className="mt-5 text-3xl font-bold">Verify Your Email</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Create an account first so we know where to send your verification
              code.
            </p>
          </>
        }
      >
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <MailCheck className="size-7" />
          </div>
          <h1 className="mt-5 text-2xl font-bold text-primary">
            Email address missing
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            We could not find a pending registration. Return to registration to
            create your account and request a verification code.
          </p>
          <Button asChild className="mt-7 h-11 w-full rounded-full">
            <Link to="/register">
              <ArrowLeft className="size-4" /> Back to registration
            </Link>
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      reverse
      panel={
        <>
          <CheckCircle2 className="mx-auto size-12 text-white/90" />
          <h2 className="mt-5 text-3xl font-bold">Almost There!</h2>
          <p className="mt-4 text-sm leading-relaxed text-white/80">
            Verify your email to activate your account and start managing your
            store.
          </p>
        </>
      }
    >
      <div className="w-full max-w-md text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="size-7" />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-primary">
          Check your email
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          Enter the 6-digit verification code sent to
          <strong className="mt-1 block break-all font-semibold text-slate-700">
            {email}
          </strong>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={code}
              onChange={(value) => {
                setCode(value.replace(/\D/g, "").slice(0, 6));
                if (error) setError("");
              }}
              inputMode="numeric"
              autoComplete="one-time-code"
              aria-label="Six-digit email verification code"
              aria-invalid={!!error}
              disabled={loading}
              autoFocus
            >
              <InputOTPGroup className="gap-2">
                {Array.from({ length: 6 }, (_, index) => (
                  <InputOTPSlot
                    key={index}
                    index={index}
                    className="size-11 rounded-lg border text-lg font-semibold sm:size-12 first:rounded-lg last:rounded-lg"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !email || code.length !== 6}
            className="h-12 w-full rounded-full text-sm font-semibold uppercase tracking-wide"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Verifying...
              </>
            ) : (
              "Verify Email"
            )}
          </Button>
        </form>

        <p className="mt-6 text-xs leading-5 text-slate-400">
          Didn&apos;t receive a code? Check your spam folder or return to
          registration to try again.
        </p>
        <Button asChild variant="link" className="mt-1 text-sm">
          <Link to="/register">
            <ArrowLeft className="size-4" /> Back to registration
          </Link>
        </Button>
      </div>
    </AuthLayout>
  );
}
