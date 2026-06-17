import api from "@/lib/axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import OtpDialog from "@/components/otp-dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";

import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "../ui/input";
import { Separator } from "../ui/separator";

export default function RegisterForm() {
  const navigate = useNavigate();

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

  const [showPassword, setShowPassword] = useState(true);
  const [showConfirm, setShowConfirm] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  const handleSubmit = async (values: any) => {
    if (!values.name) return setError("Please Enter you Full name!");
    if (!values.storeName) return setError("Please Enter Store Name");
    if (!values.email) return setError("Please enter your email!");
    if (!values.password) return setError("Please enter your password!");
    if (values.password !== values.confirmPassword) {
      return setError("Passwords do not match");
    }

    try {
      setError("");
      setLoading(true);

      await api.post("/auth/register", {
        name: values.name,
        storeName: values.storeName,
        email: values.email,
        phone: values.phone,
        password: values.password,
      });

      setUserEmail(values.email);
      setShowOtpModal(true);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(Array.isArray(msg) ? msg[0] : msg || "Sign Up Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-8">
      {/* Header */}
      <div className="text-center mt-20">
        <img src="/icons/logo.svg" alt="Logo" className="mx-auto w-8 h-8" />

        <h1 className="text-[32px] leading-tight font-semibold mb-2">
          Welcome!
        </h1>

        <p className="text-gray-500 text-[15px] leading-snug">
          Please enter your details to Create Your Account
        </p>
      </div>

      {/* FORM */}
      <Form {...formHook}>
        <form
          onSubmit={formHook.handleSubmit(handleSubmit)}
          className="space-y-4"
        >
          {/* ROW 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={formHook.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Full Name"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
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
                    <Input
                      placeholder="Store Name"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* ROW 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={formHook.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Your Email"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
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
                    <Input
                      placeholder="Phone number"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* PASSWORD */}
          <FormField
            control={formHook.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "password" : "text"}
                      placeholder="Password"
                      autoComplete="new-password"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          {/* CONFIRM */}
          <FormField
            control={formHook.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "password" : "text"}
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      className="min-h-12 w-full bg-white border-gray-150"
                      {...field}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowConfirm((p) => !p)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </Button>
                  </div>
                </FormControl>
              </FormItem>
            )}
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <Button type="submit" className="w-full min-h-12" disabled={loading}>
            {loading ? "Creating..." : "Sign Up"}
          </Button>
        </form>
      </Form>

      {/* LOGIN LINK */}
      <div className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <span
          onClick={() => navigate("/login")}
          className="cursor-pointer text-black font-medium hover:underline"
        >
          Sign In
        </span>
      </div>

      {/* Separator */}
      <div className="flex items-center gap-4">
        <Separator className="flex-1" />
        <span className="text-gray-400 text-sm">Or</span>
        <Separator className="flex-1" />
      </div>

      {/* SOCIAL */}
      <div className="grid grid-cols-2 gap-4">
        {/*Google */}
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 bg-white border-gray-150 rounded-sm py-3 h-12"
        >
          <img src="icons/google_color.svg" alt="Google" className="w-5 h-5" />
          <span className="text-sm font-medium">Google</span>
        </Button>
        {/*Apple*/}
        <Button
          type="button"
          variant="outline"
          className="flex items-center justify-center gap-2 bg-white border-gray-150 rounded-sm py-3 h-12"
        >
          <img src="/icons/apple_black.svg" alt="Apple" className="w-5 h-5" />
          <span className="text-sm font-medium">Apple</span>
        </Button>
      </div>

      {/* OTP DIALOG */}
      <OtpDialog
        open={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        title="Verify Email"
        description={`Enter the OTP sent to ${userEmail}`}
        onVerify={async (code: any) => {
          await api.post("/auth/verify-register", {
            email: userEmail,
            code,
          });
          navigate("/dashboard");
        }}
      />
    </div>
  );
}
