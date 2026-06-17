import api from "@/lib/axios";
import type { EmployeeInfo, Login, Register, Verify } from "@/types";
import useSWR from "swr";

export const register = (payload: Register) =>
  api.post("/auth/register", payload);

interface LoginResponse {
  id: string;
  role: "Admin" | "Cashier";
  message: string;
  token?: string;
  twoFactorRequired?: boolean;
}

export const login = (payload: Login) =>
  api.post<LoginResponse>("/auth/login", payload);

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useProfile() {
  const { data, isLoading, error, mutate } = useSWR<EmployeeInfo>(
    "/auth/me",
    fetcher,
    { revalidateOnFocus: true },
  );

  return { profile: data, isLoading, fetchError: error, mutate };
}

export const verifyRegister = (payload: Verify) =>
  api.post("/auth/verify-register", payload);

export const enable2FA = () => api.post("/auth/enable-2fa");

export const verify2FASetup = (code: string) =>
  api.post("/auth/verify-2fa-setup", { code });

export const disable2FA = () => api.delete("/auth/disable-2fa");
