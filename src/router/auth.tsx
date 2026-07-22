import type { RouteObject } from "react-router-dom";
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  VerifyEmailPage,
} from "./lazy-pages";

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
    path: "/auth/forgot-password",
    element: <ForgotPasswordPage />,
  },
  {
    path: "/verify-email",
    element: <VerifyEmailPage />,
  },
];
