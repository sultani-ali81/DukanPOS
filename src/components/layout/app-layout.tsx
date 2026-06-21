import { SidebarNav } from "@/components/sidebar-nav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useProfile } from "@/hooks/use-profile";
import { useAuthStore } from "@/lib/store";
import PosPage from "@/pages/pos";
import {
  Bell,
  Globe,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Search,
  UserCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";

/**
 * AppLayout — THE shell. Single source of truth for navigation + chrome.
 *
 * Mounted once by router/index.tsx for all protected routes. The login
 * route lives outside this (in authRoutes) so it never sees the shell.
 *
 * Visual design from DokanPOS's app-shell.tsx; auth from Asan_POS.
 */
export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const token = useAuthStore((s) => s.token);
  const logout = () => {
    clearAuth();
    navigate("/", { replace: true });
  };

  // Verify token + populate user via SWR
  const { profile, isLoading, fetchError } = useProfile();
  useEffect(() => {
    if (profile && !user && token) {
      const role = profile.role === "Admin" ? "Admin" : "Cashier";
      setAuth({ ...profile, role }, token);
    }
    if (fetchError && user) {
      clearAuth();
    }
  }, [profile, user, token, fetchError, setAuth, clearAuth]);

  if (pathname === "/pos") {
    return (
      <div className="min-h-screen bg-gray-300 overflow-y-auto">
        <PosPage />
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  // ── Auth guard — redirect to login if profile fetch failed ───────────────
  if (fetchError || !profile) {
    return <Navigate to="/" replace />;
  }

  if (!user) {
    // Will be caught by PrivateRoute; this is a flash guard
    return null;
  }

  const initials = user.role
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-screen gap-2.5 p-2.5 bg-gray-300">
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden w-64 shrink-0 rounded-xl bg-white lg:sticky lg:top-2.5 lg:block lg:h-[calc(100vh-1.25rem)]">
        <SidebarNav />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex min-h-[60px] shrink-0 items-center gap-3 rounded-lg bg-white px-4 py-3 md:px-6">
          {/* Mobile menu — Sheet with sidebar inside */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open menu"
                />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          {/* Search */}
          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products, sales, contacts..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Right side: language, notifications, user */}
          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <div className="flex items-center gap-3">
                  <Globe className="size-4" />
                  <span className="hidden md:inline">English</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="cursor-pointer">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>دری (Dari)</DropdownMenuItem>
                <DropdownMenuItem>پښتو (Pashto)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative"
            >
              <Bell className="size-5" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger>
                <Avatar className="size-9 cursor-pointer">
                  <AvatarImage
                    src={profile?.imageUrl ?? undefined}
                    alt={user.name ?? "Avatar"}
                  />

                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials || "?"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex space-y-1 items-center">
                    <Mail className="mr-2 h-4 w-4"></Mail>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 h-4 w-4"></UserCircle>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content — the router fills this in */}
        <main className="flex-1 overflow-y-auto rounded-lg bg-white p-2.5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
