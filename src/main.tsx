import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { SWRConfig } from "swr";
import { useAuthStore } from "./lib/store";
import { router } from "./router/index";
import "./styles/index.css";

export function AuthScopedApp() {
  const userId = useAuthStore((state) => state.user?.id ?? "anonymous");

  return (
    <SWRConfig key={userId} value={{ provider: () => new Map() }}>
      <RouterProvider router={router} />
    </SWRConfig>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Suspense fallback={null}>
      <AuthScopedApp />
    </Suspense>
    <Toaster richColors position="top-right" />
  </StrictMode>,
);
