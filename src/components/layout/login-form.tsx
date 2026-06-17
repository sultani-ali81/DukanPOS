import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useAuthStore } from "@/lib/store";
import { decodeToken } from "@/lib/utils";
import TwoFADialog from "@/pages/(auth)/two-fa-dialog";
import { login } from "@/queries/auth";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [loading, setLoading] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);

  const [showPassword, setShowPassword] = useState(true);
  const [error, setError] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const { setAuth } = useAuthStore();

  const handleSubmit = async () => {
    setError("");
    if (!form.email && !form.password)
      return setError("Email and password required");
    if (!form.email) return setError("Please enter your Email");
    if (!form.password) return setError("Please enter your password");

    try {
      setLoading(true);
      const res = await login({ email: form.email, password: form.password });

      if (res.data.twoFactorRequired) {
        setTwoFAOpen(true);
        setLoading(false);
        return;
      }

      const token = res.data.token;
      if (!token) {
        setError("Login failed: no token received");
        return;
      }

      const decoded = decodeToken<{ role: string; id: string; email: string }>(
        token,
      );
      console.log(
        "decoded role:",
        decoded?.role,
        "navigating to:",
        decoded?.role === "Cashier" ? "/pos" : "/dashboard",
      );
      if (!decoded) {
        setError("Login failed: invalid token");
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
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center">
          <img src="/icons/logo.svg" alt="Logo" className="mx-auto w-8 h-8" />

          <h1 className="text-[32px] leading-tight font-semibold mb-2">
            Welcome Back!
          </h1>

          <p className="text-gray-500 text-[15px] leading-snug">
            Please enter your details to sign in
          </p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <Input
            name="email"
            className="h-12 bg-white border-gray-150"
            type="email"
            placeholder="Your Email"
            value={form.email}
            onChange={handleChange}
          />

          {/* Password */}
          <div className="relative">
            <Input
              name="password"
              className="h-12 bg-white border-gray-150"
              type={showPassword ? "password" : "text"}
              placeholder="Your Password"
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
            />

            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={form.remember}
                onCheckedChange={(val) =>
                  setForm((prev) => ({ ...prev, remember: !!val }))
                }
              />
              <label className="text-gray-600">Remember account</label>
            </div>
            <span
              onClick={() => navigate("/forgot-password")}
              className="text-gray-400 cursor-pointer hover:underline"
            >
              Forgot Password
            </span>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12"
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </div>

        <div className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            className="text-black font-medium cursor-pointer hover:underline"
          >
            Sign Up
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-gray-400 text-sm">Or</span>
          <Separator className="flex-1" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            variant="outline"
            className="flex bg-white border-gray-150 items-center justify-center gap-2 rounded-sm py-3 h-12"
          >
            <img
              src="icons/google_color.svg"
              alt="Google"
              className="w-5 h-5"
            />
            <span className="text-sm font-medium">Google</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex items-center bg-white border-gray-150 justify-center gap-2 rounded-sm py-3 h-12"
          >
            <img src="/icons/apple_black.svg" alt="Apple" className="w-5 h-5" />
            <span className="text-sm font-medium">Apple</span>
          </Button>
        </div>
      </div>

      <TwoFADialog
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        email={form.email}
        password={form.password}
      />
    </>
  );
}
