import type { RouteObject } from "react-router-dom";
import { LoginPage, RegisterPage, VerifyEmailPage } from "./lazy-pages";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmailPage />,
  },
];
