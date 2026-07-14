import type { RouteObject } from "react-router-dom";
import { LoginPage, RegisterPage } from "./lazy-pages";

export const authRoutes: RouteObject[] = [
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/register",
    element: <RegisterPage />,
  },
];
