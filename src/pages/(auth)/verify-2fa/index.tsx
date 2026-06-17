import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Verify2FA() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const email = location.state?.email;

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    try {
      setLoading(true);

      const res = await api.post("/auth/verify-register", {
        email,
        code,
      });

      setAuth(res.data.user, res.data.token);
      navigate("/dashboard");
    } catch (err: unknown) {
      setError("Invalid code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-2xl font-semibold">Verify Code</h1>

        <p className="text-gray-500 text-sm">
          Enter the 6-digit code sent to your device
        </p>

        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="text-center text-lg tracking-widest"
          maxLength={6}
        />

        <Button
          onClick={handleVerify}
          disabled={loading || code.length !== 6}
          className="w-full"
        >
          {loading ? "Verifying..." : "Verify"}
        </Button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
