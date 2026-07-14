import { useAuthStore } from "@/lib/store";
import { Navigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";

export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((state) => state.token);
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore(
    useShallow((state) => ({ token: state.token, user: state.user })),
  );

  if (!token) return <>{children}</>;

  return (
    <Navigate to={user?.role === "Cashier" ? "/pos" : "/dashboard"} replace />
  );
}

export function RoleRoute({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: string[];
}) {
  const { token, user } = useAuthStore(
    useShallow((state) => ({ token: state.token, user: state.user })),
  );

  if (!token) return <Navigate to="/" replace />;
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
