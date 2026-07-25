import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
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
import { Globe, LogOut, Mail, Menu, Store, UserCircle } from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  // Only used for display (avatar image, etc.) — NOT for auth gating
  const { profile } = useProfile();

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  const displayName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email?.split("@")[0] ||
    "User";

  const initials = displayName
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="app-theme fixed inset-0 flex overflow-hidden bg-gray-300 p-1.5 dark:bg-gray-900 sm:gap-2.5 sm:p-2.5">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 overflow-hidden rounded-lg bg-background border border-border/60 p-1 xl:block">
        <SidebarNav />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-hidden">
        {/* Top bar */}
        <header className="z-30 flex min-h-[60px] min-w-0 shrink-0 items-center gap-3 rounded-lg border border-border/60 bg-background px-4 py-3 shadow-sm md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="xl:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="size-5" />
                </Button>
              }
            />
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarNav onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="flex min-w-0 shrink items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Store className="size-[18px]" />
            </div>
            <div className="min-w-0 leading-tight">
              <p className="truncate font-heading text-base font-bold tracking-tight text-foreground sm:text-lg">
                {profile?.storeName}
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-4 lg:gap-6">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <div className="flex items-center gap-1.5">
                  <Globe className="size-4" />
                  <span className="hidden md:inline">English</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Language</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>English</DropdownMenuItem>
                <DropdownMenuItem>دری (Dari)</DropdownMenuItem>
                <DropdownMenuItem>پښتو (Pashto)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <div className="flex items-center gap-2.5">
                  <Avatar className="size-9">
                    <AvatarImage
                      src={profile?.imageUrl ?? undefined}
                      alt={`${displayName}'s avatar`}
                    />
                    <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 text-left leading-tight md:block">
                    <p className="max-w-36 truncate text-sm font-semibold text-foreground">
                      {displayName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.role || user?.role}
                    </p>
                  </div>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex space-y-1 items-center">
                    <Mail className="mr-2 h-4 w-4" />
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <UserCircle className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-500"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg border border-border/60 bg-background p-[4.5px] shadow-sm">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-y-contain p-2.5 pb-[max(1rem,env(safe-area-inset-bottom))] scroll-pb-4 [-webkit-overflow-scrolling:touch]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
