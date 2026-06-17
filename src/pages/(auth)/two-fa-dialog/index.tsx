import OtpDialog from "@/components/otp-dialog";
import api from "@/lib/axios";
import { useAuthStore } from "@/lib/store";
import { decodeToken } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
  email: string;
  password: string;
}

export default function TwoFADialog({ open, onClose, email, password }: Props) {
  const { setAuth, setTwoFAEnabled } = useAuthStore();
  const navigate = useNavigate();

  return (
    <OtpDialog
      open={open}
      onClose={onClose}
      title="Two-Factor Authentication"
      description="Enter the 6-digit code from your authenticator app"
      onVerify={async (code) => {
        const res = await api.post("/auth/login", { email, password, code });

        const token = res.data.token;
        const decoded = decodeToken<{
          role: string;
          id: string;
          email: string;
        }>(token);
        console.log(
          "decoded role:",
          decoded?.role,
          "navigating to:",
          decoded?.role === "Cashier" ? "/pos" : "/dashboard",
        );
        setAuth(
          {
            id: decoded?.id || "",
            email: decoded?.email || email,
            role: decoded?.role as "Admin" | "Cashier",
          },
          token,
        );

        setTwoFAEnabled(true);
        navigate(decoded?.role === "Cashier" ? "/pos" : "/dashboard", {
          replace: true,
        });
      }}
    />
  );
}
