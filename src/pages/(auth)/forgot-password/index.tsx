import api from "@/lib/axios";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!email) return;

    try {
      setLoading(true);

      await api.post("/auth/forgot-password", { email });

      setMessage("Password reset link sent to your email");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Forgot Password</h1>
        <Input
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Sending..." : "Send Reset Link"}
        </Button>

        {message && (
          <p className="text-center text-sm text-gray-500">{message}</p>
        )}
      </div>
    </div>
  );
}
