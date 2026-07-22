import { lazy } from "react";

export const LoginPage = lazy(() => import("@/pages/(auth)/login"));
export const ForgotPasswordPage = lazy(
  () => import("@/pages/(auth)/forgot-password"),
);
export const RegisterPage = lazy(() => import("@/pages/(auth)/register"));
export const VerifyEmailPage = lazy(
  () => import("@/pages/(auth)/verify-email"),
);
export const AiAssistantPage = lazy(
  () => import("@/pages/ai-assistant/page"),
);
export const CategoriesPage = lazy(() => import("@/pages/categories"));
export const ContactsPage = lazy(() => import("@/pages/contacts"));
export const DashboardPage = lazy(() => import("@/pages/dashboard"));
export const InventoryDetailPage = lazy(
  () => import("@/pages/inventory/[id]/page"),
);
export const InventoryPage = lazy(() => import("@/pages/inventory/page"));
export const JournalPage = lazy(() => import("@/pages/journal/page"));
export const PosPage = lazy(() => import("@/pages/pos"));
export const ProductDetailPage = lazy(
  () => import("@/pages/products/[id]/page"),
);
export const ProductsPage = lazy(() => import("@/pages/products/page"));
export const ProfilePage = lazy(() => import("@/pages/profile/page"));
export const PurchaseDetailPage = lazy(
  () => import("@/pages/purchases/[id]"),
);
export const PurchasesPage = lazy(() => import("@/pages/purchases/index"));
export const NewPurchasePage = lazy(() => import("@/pages/purchases/new"));
export const ReportsPage = lazy(() => import("@/pages/reports/page"));
export const SaleDetailPage = lazy(() => import("@/pages/sales/[id]"));
export const SalesPage = lazy(() => import("@/pages/sales"));
export const NewStockMovementPage = lazy(
  () => import("@/pages/stock-movement/new"),
);
export const UnauthorizedPage = lazy(() => import("@/pages/unauthorized"));
export const UsersPage = lazy(() => import("@/pages/users/page"));
