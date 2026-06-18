import { navItems } from "@/lib/nav";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Store } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const pathname = location.pathname;

  // Filter items the current user is allowed to see
  const visibleItems = navItems.filter((item) => {
    if (!item.role) return true;
    if (!user) return false;
    return item.role.includes(user.role);
  });

  return (
    <div className="flex flex-col h-full ">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
        <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Store className="size-5" />
        </div>
        <div className="leading-tight">
          <p className="text-base font-bold text-sidebar-foreground">
            Dukan POS
          </p>
          <p className="text-xs text-muted-foreground">Retail made simple</p>
        </div>
      </div>

      <nav className="flex-1 px-3 pt-6">
        {visibleItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-md font-medium rounded-lg transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
