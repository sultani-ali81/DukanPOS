import api from "@/lib/axios";
import type { Login, Register, Verify } from "@/types";

export const register = (payload: Register) =>
  api
    .post<{ message: string }>("/auth/register", payload)
    .then((response) => response.data);

interface LoginResponse {
  message: string;
  token?: string;
  twoFactorRequired?: boolean;
}

export const login = (payload: Login) =>
  api
    .post<LoginResponse>("/auth/login", payload)
    .then((response) => response.data);

interface VerifyRegisterResponse {
  message: string;
  token: string;
}

export const verifyRegister = (payload: Verify) =>
  api
    .post<VerifyRegisterResponse>("/auth/verify-register", payload)
    .then((response) => response.data);

export const forgotPassword = (email: string) =>
  api
    .post<{ message: string }>("/auth/forgot-password", { email })
    .then((response) => response.data);

export const resetPassword = (payload: {
  token: string | null;
  password: string;
}) =>
  api
    .post<{ message: string }>("/auth/reset-password", payload)
    .then((response) => response.data);

export const enable2FA = (): Promise<{ qrCode: string }> =>
  api.post<{ qrCode: string }>("/auth/enable-2fa").then((response) => response.data);

export const verify2FASetup = (code: string) =>
  api
    .post<{ message: string }>("/auth/verify-2fa-setup", { code })
    .then((response) => response.data);

export const disable2FA = (): Promise<{ message: string }> =>
  api
    .delete<{ message: string }>("/auth/disable-2fa")
    .then((response) => response.data);
