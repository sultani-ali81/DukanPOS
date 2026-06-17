import { SidebarNav } from "@/components/sidebar-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Bell, Globe, Menu, Search } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;

  // The POS and auth screens run full-screen without the app chrome.
  if (pathname === "/login") {
    return <div className="min-h-screen bg-gray-100">{children}</div>;
  }

  if (pathname === "/pos") {
    return <div className="min-h-screen bg-gray-100 p-2.5"></div>;
  }

  return (
    <div className="flex min-h-screen gap-2.5 p-2.5 bg-gray-100">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 rounded-xl bg-white lg:sticky lg:top-2.5 lg:block lg:h-[calc(100vh-1.25rem)]">
        <SidebarNav />
      </aside>

      <div className="flex  min-w-0 flex-1 flex-col gap-2.5">
        {/* Top bar */}
        <header className="sticky top-0 z-30 min-h-[80px] flex shrink-0 items-center gap-3 rounded-lg bg-white px-4 py-3 backdrop-blur md:px-6">
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

          <div className="relative hidden max-w-sm flex-1 sm:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search products, sales, contacts..."
              className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant="ghost" size="sm" className="gap-2" />}
              >
                <Globe className="size-4" />
                <span className="hidden sm:inline">English</span>
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

            <button
              onClick={() => navigate("/profile")}
              aria-label="Open profile"
              className="block"
            >
              <Avatar className="size-9 cursor-pointer">
                <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                  SJ
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-2.5 rounded-lg bg-white">
          {children}
        </main>
      </div>
    </div>
  );
}
