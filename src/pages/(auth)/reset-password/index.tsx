import { resetPassword } from "@/queries/auth";
import { extractError } from "@/lib/error";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const token = params.get("token");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async () => {
    if (!password || password !== confirm) {
      return setMessage("Passwords do not match");
    }

    try {
      setLoading(true);

      await resetPassword({
        token,
        password,
      });

      setMessage("Password updated successfully");

      setTimeout(() => navigate("/login"), 2000);
    } catch (err: unknown) {
      setMessage(extractError(err, "Reset failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-semibold text-center">Reset Password</h1>

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <Input
          type="password"
          placeholder="Confirm password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />

        <Button onClick={handleSubmit} disabled={loading} className="w-full">
          {loading ? "Updating..." : "Update Password"}
        </Button>

        {message && (
          <p className="text-center text-sm text-gray-500">{message}</p>
        )}
      </div>
    </div>
  );
}
