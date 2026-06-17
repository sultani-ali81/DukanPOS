import LoginPage from "@/pages/(auth)/login";
import type { RouteObject } from "react-router-dom";

// Public auth routes — no layout, no shell.
export const authRoutes: RouteObject[] = [
  {
    path: "/",
    element: <LoginPage />,
  },
];
