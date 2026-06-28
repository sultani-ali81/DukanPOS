import api from "@/lib/axios";
import type { Login, Register, Verify } from "@/types";

export const register = (payload: Register) =>
  api.post("/auth/register", payload);

interface LoginResponse {
  message: string;
  token?: string;
  twoFactorRequired?: boolean;
}

export const login = (payload: Login) =>
  api.post<LoginResponse>("/auth/login", payload);

export const verifyRegister = (payload: Verify) =>
  api.post("/auth/verify-register", payload);

export const enable2FA = () => api.post("/auth/enable-2fa");

export const verify2FASetup = (code: string) =>
  api.post("/auth/verify-2fa-setup", { code });

export const disable2FA = () => api.delete("/auth/disable-2fa");
