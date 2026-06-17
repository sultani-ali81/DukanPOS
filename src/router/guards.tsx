import { useAuthStore } from "@/lib/store";
import { Navigate } from "react-router-dom";

// Logged-in users only — others go to login
export function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useAuthStore();
  return token ? <>{children}</> : <Navigate to="/" replace />;
}

// Logged-out users only — logged-in users go to their home page based on role
export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuthStore();

  if (!token) return <>{children}</>;

  return (
    <Navigate to={user?.role === "Cashier" ? "/pos" : "/dashboard"} replace />
  );
}

// Logged-in users with a specific role — others go to unauthorized
export function RoleRoute({
  children,
  allowed,
}: {
  children: React.ReactNode;
  allowed: string[];
}) {
  const { token, user } = useAuthStore();

  if (!token) return <Navigate to="/" replace />;
  if (!user || !allowed.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
