import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { useUtilsStore } from "./utilsStore";
type User = {
  name?: string;
  id: string;
  email: string;
  role: "Admin" | "Cashier";
};

type AuthState = {
  user: User | null;
  token: string | null;
  twoFAEnabled: boolean;
  setAuth: (user: User, token: string) => void;
  setTwoFAEnabled: (enabled: boolean) => void;
  clearAuth: () => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      twoFAEnabled: false,

      setAuth: (user, token) => {
        set({
          user,
          token,
        });
      },

      setTwoFAEnabled: (enabled) => {
        set({
          twoFAEnabled: enabled,
        });
      },

      clearAuth: () => {
        set({
          user: null,
          token: null,
          twoFAEnabled: false,
        });
      },

      logout: () => {
        get().clearAuth();
        useUtilsStore.getState().clearUtilsStore();
      },
    }),
    {
      name: "auth-storage",

      storage: createJSONStorage(() => localStorage),
    },
  ),
);
