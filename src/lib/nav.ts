import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  Bot,
  Boxes,
  Contact,
  LayoutDashboard,
  Package,
  ShoppingCart,
  Tags,
  UserCog,
} from "lucide-react";

export const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { title: "POS", href: "/pos", icon: ShoppingCart },
  { title: "Products", href: "/products", icon: Package },
  { title: "Categories", href: "/categories", icon: Tags },
  { title: "Inventory", href: "/inventory", icon: Boxes },
  { title: "Purchases", href: "/purchases", icon: BookOpen },
  { title: "Contacts", href: "/contacts", icon: Contact },
  { title: "Reports", href: "/reports", icon: BarChart3 },
  { title: "Users", href: "/users", icon: UserCog },
  {
    title: "Journal",
    href: "/journal",
    icon: BookOpenCheck,
    hideFromCashier: true,
  },
];
