import LoginPage from "@/pages/(auth)/login";
import Register from "@/pages/(auth)/register";
import type { RouteObject } from "react-router-dom";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <Register />,
  },
];
