import api from "@/lib/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import AuthLayout from "@/components/layout/auth-layout";
import OtpDialog from "@/components/otp-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneNumberInput } from "@/components/ui/phoneinput";

import type { Value } from "react-phone-number-input";
import { isValidPhoneNumber } from "react-phone-number-input";

import { Eye, EyeOff, Lock, Mail, Store, User } from "lucide-react";
import { useForm } from "react-hook-form";

import { useAuthStore } from "@/lib/store";
import { decodeToken } from "@/lib/utils";

type ApiError = {
  response?: { data?: { message?: string | string[] } };
};

export default function RegisterForm() {
  const navigate = useNavigate();

  const { setAuth } = useAuthStore();

  const formHook = useForm({
    defaultValues: {
      name: "",
      storeName: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
    },
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleSubmit = async (values: {
    name: string;
    storeName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) => {
    if (!values.name) return setError("Please enter your name");

    if (!values.storeName) return setError("Please enter store name");

    if (!values.email) return setError("Please enter email");

    if (!values.phone) return setError("Please enter phone number");

    if (!isValidPhoneNumber(values.phone))
      return setError("Enter a valid phone number");

    if (!values.password) return setError("Please enter password");

    if (values.password !== values.confirmPassword)
      return setError("Passwords do not match");

    try {
      setLoading(true);
      setError("");

      await api.post("/auth/register", {
        name: values.name,
        storeName: values.storeName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      setUserEmail(values.email);
      setShowOtpModal(true);
    } catch (err) {
      const msg = (err as ApiError)?.response?.data?.message;

      setError(Array.isArray(msg) ? msg[0] : msg || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const fieldClass = "h-12 rounded-xl pl-12 pr-12 placeholder:text-slate-400 ";

  return (
    <>
      <AuthLayout
        reverse
        panel={
          <>
            <h2 className="text-3xl font-bold">Welcome Back!</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/80">
              Already have an account? Sign in to continue managing your store.
            </p>
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="mt-8 rounded-full border-1 border-white px-12 py-3 text-sm font-semibold uppercase tracking-wide transition text-white hover:bg-blue-900 hover:text-primary cursor-pointer"
            >
              Sign In
            </button>
          </>
        }
      >
        <div className="w-full max-w-sm">
          {/* Brand */}

          <h1 className="text-center text-3xl font-bold text-teal-600">
            Create Your Store
          </h1>
          <p className="mt-2 text-center text-sm text-slate-400">
            Set up your POS account in minutes
          </p>

          <Form {...formHook}>
            <form
              onSubmit={formHook.handleSubmit(handleSubmit)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={formHook.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Owner Name"
                          className={fieldClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={formHook.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Store className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          placeholder="Store Name"
                          className={fieldClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={formHook.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="email"
                          placeholder="Email"
                          className={fieldClass}
                          {...field}
                        />
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={formHook.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <PhoneNumberInput
                        value={field.value as Value}
                        placeholder="700000000"
                        onChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={formHook.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password"
                          className={`${fieldClass} pr-12`}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowPassword((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                        >
                          {showPassword ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={formHook.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
                        <Input
                          type={showConfirm ? "text" : "password"}
                          placeholder="Confirm Password"
                          className={`${fieldClass} pr-12`}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setShowConfirm((prev) => !prev)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:bg-transparent"
                        >
                          {showConfirm ? (
                            <EyeOff size={18} />
                          ) : (
                            <Eye size={18} />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                  </FormItem>
                )}
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
                  className="h-12 rounded-full bg-primary/90 px-16 text-sm font-semibold uppercase tracking-wide text-white hover:bg-primary"
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </Button>
              </div>
            </form>
          </Form>

          {/* Mobile-only switch link */}
          <div className="mt-6 text-center text-sm text-slate-500 lg:hidden">
            Already have an account?{" "}
            <span
              onClick={() => navigate("/login")}
              className="cursor-pointer font-semibold text-teal-600 hover:underline"
            >
              Sign In
            </span>
          </div>
        </div>
      </AuthLayout>

      <OtpDialog
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Verify Email"
        description={`Enter the OTP sent to ${userEmail}`}
        onVerify={async (code: string) => {
          const res = await api.post<{ message: string; token: string }>(
            "/auth/verify-register",
            { email: userEmail, code },
          );

          const token = res.data.token;
          if (!token) throw new Error("No token received");

          const decoded = decodeToken<{
            id: string;
            email: string;
            role: string;
          }>(token);
          if (!decoded) throw new Error("Invalid token");

          setAuth(
            {
              id: decoded.id,
              email: decoded.email,
              role: decoded.role as "Admin" | "Cashier",
            },
            token,
          );

          navigate(decoded.role === "Cashier" ? "/pos" : "/dashboard");
        }}
      />
    </>
  );
}
