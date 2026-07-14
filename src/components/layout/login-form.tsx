import { AuthInput } from "@/components/layout/auth-input";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store";
import { extractError } from "@/lib/error";
import { decodeToken } from "@/lib/utils";
import TwoFADialog from "@/pages/(auth)/two-fa-dialog";
import { login } from "@/queries/auth";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "@/components/layout/auth-layout";

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

  const setAuth = useAuthStore((state) => state.setAuth);

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

      if (res.twoFactorRequired) {
        setTwoFAOpen(true);
        return;
      }

      const token = res.token;

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
    } catch (err: unknown) {
      setError(extractError(err, "Login failed"));
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
              className="mt-8 rounded-full border-1 border-white px-12 py-3 text-sm font-semibold uppercase tracking-wide transition text-white hover:bg-blue-900 hover:text-primary cursor-pointer"
            >
              Sign Up
            </button>
          </>
        }
      >
        <div className="w-full max-w-sm">
          <h1 className="text-center text-3xl font-bold text-primary">
            Welcome Back
          </h1>
          <p className="mt-2 text-center text-sm text-slate-600">
            Sign in to manage your store
          </p>

          {/* Email */}
          <div className="mt-8 space-y-4">
            <AuthInput
              icon={Mail}
              name="email"
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />

            {/* Password */}
            <AuthInput
              icon={Lock}
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="new-password"
              trailing={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </Button>
              }
            />
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
            Don't have an account?{" "}
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
