import AppLayout from "@/components/layout/app-layout";
import Login from "@/pages/(auth)/login";
import CategoriesPage from "@/pages/categories";
import ContactsPage from "@/pages/contacts";
import Dashboard from "@/pages/dashboard";
import InventoryDetailPage from "@/pages/inventory/[id]/page";
import InventoryPage from "@/pages/inventory/page";
import JournalPage from "@/pages/journal/page";
import PosPage from "@/pages/pos";
import ProductDetailPage from "@/pages/products/[id]/page";
import ProductsPage from "@/pages/products/page";
import ProfilePage from "@/pages/profile/page";
import ViewPurchase from "@/pages/purchases/[id]";
import Purchases from "@/pages/purchases/index";
import NewPurchasePage from "@/pages/purchases/new";
import Report from "@/pages/reports/page";
import UnauthorizedPage from "@/pages/unauthorized";
import UsersPage from "@/pages/users/page";
import { createBrowserRouter } from "react-router-dom";
import { authRoutes } from "./auth";
import { PrivateRoute, PublicRoute, RoleRoute } from "./guards";

export const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <PublicRoute>
        <Login />
      </PublicRoute>
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
            <Dashboard />
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
            <Report />
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
        path: "/purchases",
        element: (
          <RoleRoute allowed={["Admin"]}>
            <Purchases />
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
            <ViewPurchase />
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
      {
        path: "/pos",
        element: (
          <PrivateRoute>
            <PosPage />
          </PrivateRoute>
        ),
      },
    ],
  },
]);
