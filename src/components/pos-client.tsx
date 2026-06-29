"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  categories,
  contacts,
  CURRENCY,
  formatCurrency,
  products,
  type Product,
} from "@/lib/data";
import { cn } from "@/lib/utils";
import {
  Banknote,
  Delete,
  Minus,
  Percent,
  Plus,
  Printer,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

type CartItem = { product: Product; qty: number };

export function PosClient() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [customer, setCustomer] = useState("Walk-in");
  const [cartOpen, setCartOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [tendered, setTendered] = useState("");

  const customers = contacts.filter((c) => c.type === "customer");
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        activeCategory === "all" || p.categoryId === activeCategory;
      const matchQuery =
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.barcode.includes(query);
      return matchCat && matchQuery;
    });
  }, [activeCategory, query]);

  function addToCart(product: Product) {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  }

  function updateQty(id: string, delta: number) {
    setCart((prev) =>
      prev
        .map((i) =>
          i.product.id === id ? { ...i, qty: Math.max(0, i.qty + delta) } : i,
        )
        .filter((i) => i.qty > 0),
    );
  }

  function removeItem(id: string) {
    setCart((prev) => prev.filter((i) => i.product.id !== id));
  }

  const subtotal = cart.reduce(
    (sum, i) => sum + i.product.sellingPrice * i.qty,
    0,
  );
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;
  const itemCount = cart.reduce((sum, i) => sum + i.qty, 0);

  const tenderedNum = Number.parseFloat(tendered) || 0;
  const change = tenderedNum - total;

  function openPayment() {
    if (cart.length === 0) {
      toast.error("Cart is empty", {
        description: "Add products before completing the sale.",
      });
      return;
    }
    setTendered("");
    setCartOpen(false);
    setPayOpen(true);
  }

  function finalizeSale(print: boolean) {
    if (tenderedNum < total) {
      toast.error("Insufficient cash", {
        description: `Received ${formatCurrency(tenderedNum)} of ${formatCurrency(total)}.`,
      });
      return;
    }
    toast.success("Sale completed", {
      description: `${itemCount} items · ${formatCurrency(total)} · Change ${formatCurrency(Math.max(0, change))}${print ? " · Receipt printed" : ""}`,
    });
    setCart([]);
    setDiscount(0);
    setCustomer("Walk-in");
    setTendered("");
    setPayOpen(false);
  }

  // Calculator keypad input handling.
  function pressKey(key: string) {
    setTendered((prev) => {
      if (key === "back") return prev.slice(0, -1);
      if (key === ".")
        return prev.includes(".") ? prev : prev === "" ? "0." : prev + ".";
      // Prevent more than 2 decimal places.
      if (prev.includes(".") && prev.split(".")[1]?.length >= 2) return prev;
      return prev === "0" ? key : prev + key;
    });
  }

  const quickCash = [total, 100, 200, 500, 1000, 2000]
    .filter((v, i, arr) => v > 0 && arr.indexOf(v) === i)
    .slice(0, 6);

  const cartPanel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <div className="flex items-center gap-2">
          <ShoppingCart className="size-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Current Sale</h2>
        </div>
        {cart.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setCart([])}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {/* Customer */}
      <div className="border-b border-border px-4 py-3">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <User className="size-3.5" /> Customer
        </label>
        <select
          value={customer}
          onChange={(e) => setCustomer(e.target.value)}
          className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="Walk-in">Walk-in Customer</option>
          {customers.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {cart.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
            <ShoppingCart className="size-10 opacity-40" />
            <p className="text-sm">No items yet. Tap products to add them.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.product.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.product.sellingPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => updateQty(item.product.id, -1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus className="size-3.5" />
                  </Button>
                  <span className="w-7 text-center text-sm font-semibold">
                    {item.qty}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    className="size-8"
                    onClick={() => updateQty(item.product.id, 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus className="size-3.5" />
                  </Button>
                </div>
                <div className="w-20 text-right text-sm font-bold text-foreground">
                  {formatCurrency(item.product.sellingPrice * item.qty)}
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(item.product.id)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="space-y-3 border-t border-border px-4 py-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-medium text-foreground">
            {formatCurrency(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Percent className="size-3.5" /> Discount
          </span>
          <div className="flex items-center gap-1">
            {[0, 5, 10, 15].map((d) => (
              <button
                key={d}
                onClick={() => setDiscount(d)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium transition-colors",
                  discount === d
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-accent",
                )}
              >
                {d}%
              </button>
            ))}
          </div>
        </div>

        {discount > 0 ? (
          <div className="flex items-center justify-between text-sm text-emerald-600">
            <span>Discount ({discount}%)</span>
            <span>-{formatCurrency(discountAmount)}</span>
          </div>
        ) : null}

        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-base font-bold text-foreground">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatCurrency(total)}
          </span>
        </div>

        <Button size="lg" className="h-12 w-full" onClick={openPayment}>
          <Banknote className="size-5" /> Charge {formatCurrency(total)}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen flex-col">
      {/* POS top bar */}
      <header className="flex items-center min-h-[80px] gap-3 border-b border-border bg-white rounded-xl px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-white text-primary-foreground">
            <Store className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-foreground">Dukan POS</p>
            <p className="text-xs text-muted-foreground">
              Cashier: Sayed Jamal
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="secondary" className="hidden sm:inline-flex">
            {itemCount} items in cart
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/dashboard")}
          >
            <X className="size-4" /> Exit POS
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 pt-2.5 lg:flex-row">
        {/* Left + center */}
        <div className="flex bg-white rounded-xl border min-w-0 flex-1 flex-col gap-4">
          {/* Search */}
          <div className="relative pt-2.5 px-2.5">
            <span>
              <Search className="pointer-events-none absolute left-5 top-3/5 size-5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or scan barcode..."
                className="h-12 w-full rounded-xl border border-input bg-card pl-11 pr-4 text-base outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </span>
          </div>

          {/* Categories */}
          <div className="flex flex-wrap gap-2 p-2.5">
            <button
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                activeCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-accent",
              )}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-accent",
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4 p-2.5">
            {filtered.map((p) => {
              const out = p.stock <= 0;
              return (
                <Card
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !out && addToCart(p)}
                  onKeyDown={(e) => {
                    if ((e.key === "Enter" || e.key === " ") && !out) {
                      e.preventDefault();
                      addToCart(p);
                    }
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col justify-between gap-2 p-4 transition-all hover:border-primary hover:shadow-md",
                    out && "cursor-not-allowed opacity-50",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-semibold text-foreground">
                      {p.name}
                    </span>
                    <Badge
                      variant={
                        p.stock <= p.lowStockThreshold
                          ? "destructive"
                          : "secondary"
                      }
                      className="shrink-0"
                    >
                      {p.stock}
                    </Badge>
                  </div>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(p.sellingPrice)}
                  </p>
                </Card>
              );
            })}
            {filtered.length === 0 ? (
              <p className="col-span-full py-10 text-center text-sm text-muted-foreground">
                No products found.
              </p>
            ) : null}
          </div>
        </div>

        {/* Desktop cart */}
        <Card className="hidden w-[22rem] shrink-0 overflow-hidden p-0 lg:block">
          {cartPanel}
        </Card>
      </div>

      {/* Mobile cart trigger */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetTrigger
          render={
            <Button
              size="lg"
              className="fixed bottom-5 right-5 z-40 h-14 gap-2 rounded-full shadow-lg lg:hidden"
            >
              <ShoppingCart className="size-5" />
              {itemCount > 0 ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-primary-foreground text-xs font-bold text-primary">
                  {itemCount}
                </span>
              ) : null}
              <span>{formatCurrency(total)}</span>
            </Button>
          }
        />
        <SheetContent side="right" className="w-full p-0 sm:max-w-md">
          <SheetTitle className="sr-only">Current Sale</SheetTitle>
          {cartPanel}
        </SheetContent>
      </Sheet>

      {/* Payment + cash/change calculator */}
      <Dialog open={payOpen} onOpenChange={setPayOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Cash Payment</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Amounts */}
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Amount due
                </p>
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(total)}
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Cash received
                </p>
                <p className="text-2xl font-bold text-foreground tabular-nums">
                  {CURRENCY} {tenderedNum.toLocaleString("en-US")}
                </p>
              </div>
              <div
                className={cn(
                  "rounded-xl border p-4",
                  change >= 0
                    ? "border-emerald-500/40 bg-emerald-500/10"
                    : "border-destructive/40 bg-destructive/10",
                )}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {change >= 0 ? "Change to return" : "Remaining"}
                </p>
                <p
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    change >= 0 ? "text-emerald-600" : "text-destructive",
                  )}
                >
                  {formatCurrency(Math.abs(change))}
                </p>
              </div>
            </div>

            {/* Keypad */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                {quickCash.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTendered(String(amt))}
                    className="rounded-lg bg-secondary px-2 py-2 text-xs font-semibold text-secondary-foreground transition-colors hover:bg-accent"
                  >
                    {amt === total ? "Exact" : amt.toLocaleString()}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  "1",
                  "2",
                  "3",
                  "4",
                  "5",
                  "6",
                  "7",
                  "8",
                  "9",
                  ".",
                  "0",
                  "back",
                ].map((k) => (
                  <button
                    key={k}
                    onClick={() => pressKey(k)}
                    className="flex h-12 items-center justify-center rounded-lg border border-border bg-card text-lg font-semibold text-foreground transition-colors hover:bg-accent"
                    aria-label={k === "back" ? "Delete" : k}
                  >
                    {k === "back" ? <Delete className="size-5" /> : k}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="h-12"
              onClick={() => finalizeSale(true)}
            >
              <Printer className="size-5" /> Pay &amp; Print
            </Button>
            <Button
              size="lg"
              className="h-12"
              onClick={() => finalizeSale(false)}
            >
              Complete Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
