import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/store";
import { decodeToken } from "@/lib/utils";
import TwoFADialog from "@/pages/(auth)/two-fa-dialog";
import { login } from "@/queries/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "@/components/layout/auth-layout";

type ApiError = {
  response?: { data?: { message?: string | string[] } };
};

export default function LoginForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const { setAuth } = useAuthStore();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    setError("");

    if (!form.email && !form.password)
      return setError("Email and password required");

    if (!form.email) return setError("Please enter your email");

    if (!form.password) return setError("Please enter your password");

    try {
      setLoading(true);

      const res = await login({
        email: form.email,
        password: form.password,
      });

      if (res.data.twoFactorRequired) {
        setTwoFAOpen(true);
        return;
      }

      const token = res.data.token;

      if (!token) {
        setError("Login failed");
        return;
      }

      const decoded = decodeToken<{
        role: string;
        id: string;
        email: string;
      }>(token);

      if (!decoded) {
        setError("Invalid token");
        return;
      }

      setAuth(
        {
          id: decoded.id || "",
          email: decoded.email || form.email,
          role: decoded.role as "Admin" | "Cashier",
        },
        token,
      );

      navigate(decoded.role === "Cashier" ? "/pos" : "/dashboard", {
        replace: true,
      });
    } catch (err) {
      const msg = (err as ApiError)?.response?.data?.message;

      setError(Array.isArray(msg) ? msg[0] : msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthLayout
        panel={
          <>
            <h2 className="text-3xl font-bold">Hello, Friend!</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Enter your details and start your journey with us today.
            </p>
            <button
              type="button"
              onClick={() => navigate("/register")}
              className="mt-8 rounded-full border-2 border-white px-12 py-3 text-sm font-semibold uppercase tracking-wide transition hover:bg-white hover:text-teal-600"
            >
              Sign Up
            </button>
          </>
        }
      >
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="mb-8 flex items-center gap-2">
            <img src="logo.svg" alt="Logo" className="h-7 w-7" />
            <span className="text-lg font-bold text-primary/90">POS</span>
          </div>

          <h1 className="text-center text-3xl font-bold text-primary">
            Welcome Back
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to manage your store
          </p>

          {/* Email */}
          <div className="mt-8 space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                name="email"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={handleChange}
                className="h-12 rounded-xl border-transparent bg-slate-100 pl-12 text-slate-700 placeholder:text-slate-400 focus-visible:ring-teal-500"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="Password"
                autoComplete="new-password"
                className="h-12 rounded-xl border-transparent bg-slate-100 pl-12 pr-12 text-slate-700 placeholder:text-slate-400 focus-visible:ring-teal-500"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </div>
          </div>

          {/* Remember + Forgot */}
          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.remember}
                onCheckedChange={(value) =>
                  setForm((prev) => ({
                    ...prev,
                    remember: !!value,
                  }))
                }
              />
              <span className="text-slate-500">Remember me</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/forgot-password")}
              className="text-slate-400 hover:text-teal-600"
            >
              Forgot your password?
            </button>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <Button
              disabled={loading}
              onClick={handleSubmit}
              className="h-12 rounded-full bg-primary/90 px-16 text-sm font-semibold uppercase tracking-wide text-white hover:bg-primary"
            >
              {loading ? "Signing In..." : "Sign In"}
            </Button>
          </div>

          {/* Mobile-only switch link */}
          <div className="mt-6 text-center text-sm text-slate-500 lg:hidden">
            Don&apos;t have an account?{" "}
            <span
              onClick={() => navigate("/register")}
              className="cursor-pointer font-semibold text-teal-600 hover:underline"
            >
              Create Account
            </span>
          </div>
        </div>
      </AuthLayout>

      <TwoFADialog
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        email={form.email}
        password={form.password}
      />
    </>
  );
}
