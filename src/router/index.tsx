import AppLayout from "@/components/layout/app-layout";
import { createBrowserRouter } from "react-router-dom";
import { authRoutes } from "./auth";
import { PrivateRoute, PublicRoute, RoleRoute } from "./guards";
import {
  AiAssistantPage,
  CategoriesPage,
  ContactsPage,
  DashboardPage,
  InventoryDetailPage,
  InventoryPage,
  JournalPage,
  LoginPage,
  NewPurchasePage,
  NewStockMovementPage,
  PosPage,
  ProductDetailPage,
  ProductsPage,
  ProfilePage,
  PurchaseDetailPage,
  PurchasesPage,
  ReportsPage,
  SaleDetailPage,
  SalesPage,
  UnauthorizedPage,
  UsersPage,
} from "./lazy-pages";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    ),
  },

  // POS lives outside AppLayout — full-screen UI, no shell
  {
    path: "/pos",
    element: (
      <PrivateRoute>
        <PosPage />
      </PrivateRoute>
    ),
  },

  ...authRoutes,

  {
    element: <AppLayout />,
    children: [
      {
        path: "/unauthorized",
        element: (
          <PrivateRoute>
            <UnauthorizedPage />
          </PrivateRoute>
        ),
      },
      {
        path: "/dashboard",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <DashboardPage />
          </RoleRoute>
        ),
      },
      {
        path: "/ai-assistant",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <AiAssistantPage />
          </RoleRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <ProfilePage />
          </RoleRoute>
        ),
      },
      {
        path: "/categories",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <CategoriesPage />
          </RoleRoute>
        ),
      },
      {
        path: "/sales",
        element: (
          <RoleRoute allowed={["Admin", "Cashier"]}>
            <SalesPage />
          </RoleRoute>
        ),
      },
      {
        path: "/sales/:id",
        element: (
          <RoleRoute allowed={["Admin", "Cashier"]}>
            <SaleDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: "/products",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <ProductsPage />
          </RoleRoute>
        ),
      },
      {
        path: "/products/:id",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <ProductDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: "/reports",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <ReportsPage />
          </RoleRoute>
        ),
      },
      {
        path: "/inventory",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <InventoryPage />
          </RoleRoute>
        ),
      },
      {
        path: "/inventory/:id",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <InventoryDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: "/stock-movement/new",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <NewStockMovementPage />
          </RoleRoute>
        ),
      },
      {
        path: "/purchases",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <PurchasesPage />
          </RoleRoute>
        ),
      },
      {
        path: "/purchases/new",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <NewPurchasePage />
          </RoleRoute>
        ),
      },
      {
        path: "/purchases/:id",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <PurchaseDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: "/journal",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <JournalPage />
          </RoleRoute>
        ),
      },
      {
        path: "/contacts",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <ContactsPage />
          </RoleRoute>
        ),
      },
      {
        path: "/users",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <UsersPage />
          </RoleRoute>
        ),
      },
    ],
  },
]);
