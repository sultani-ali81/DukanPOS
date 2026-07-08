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
import {
  Bell,
  Globe,
  LogOut,
  Mail,
  Menu,
  Search,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Input } from "../ui/input";

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

  const initials = (user?.name ?? user?.role ?? "?")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-dvh overflow-hidden gap-2.5 bg-gray-300 p-2.5">
      {/* Desktop sidebar */}
      <aside className="hidden h-full w-64 shrink-0 rounded-lg bg-white lg:block">
        <SidebarNav />
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-hidden">
        {/* Top bar */}
        <header className="z-30 flex min-h-[60px] shrink-0 items-center gap-3 rounded-lg bg-white px-4 py-3 md:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
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

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, sales, contacts..."
              className="h-10 w-full rounded-lg  pl-9 pr-3 text-sm placeholder:text-muted-foreground "
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer">
                <div className="flex items-center gap-3">
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
                    alt={user?.name ?? "Avatar"}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
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

        <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden rounded-lg bg-white p-[4.5px]">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto p-2.5">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
