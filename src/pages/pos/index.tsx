import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { useUtilsStore } from "@/lib/utilsStore";
import { getCustomers } from "@/queries/customer";
import type { PosProduct } from "@/queries/pos-inventory";
import { getPosInventory } from "@/queries/pos-inventory";
import type { Category } from "@/types";
import type { SaleReceipt } from "@/types/sale";
import { ArrowLeft, Lock, ShoppingCart, Unlock, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { PosCategoryFilter } from "./components/pos-category-filter";
import { PosInventoryCombobox } from "./components/pos-inventory-combobox";
import { PosOrderDetails } from "./components/pos-order-details";
import { PosProductList } from "./components/pos-product-list";
import { PosReceiptDialog } from "./components/pos-receipt-dialog";
import {
  CloseSessionDialog,
  OpenSessionDialog,
} from "./components/pos-session-dialog";
import { usePosOrder } from "./components/use-pos-order";
import { usePosSession } from "./components/use-pos-session";

const ITEMS_PER_PAGE = 12;

// ── Barcode WebSocket hook ────────────────────────────────────────────────────

function useBarcodeScanner({
  onBarcode,
  enabled = true,
}: {
  onBarcode: (barcode: string) => void;
  enabled?: boolean;
}) {
  const onBarcodeRef = useRef(onBarcode);
  useEffect(() => {
    onBarcodeRef.current = onBarcode;
  }, [onBarcode]);

  const wsConnected = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let dead = false;

    function connect() {
      if (dead) return;
      ws = new WebSocket("ws://localhost:8765");

      ws.onopen = () => {
        wsConnected.current = true;
        console.log("[BarcodeScanner] WebSocket connected");
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { barcode: string };
          if (data.barcode) onBarcodeRef.current(data.barcode);
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        wsConnected.current = false;
        console.log("[BarcodeScanner] WebSocket closed, retrying in 2 s…");
        if (!dead) reconnectTimer = setTimeout(connect, 2000);
      };

      ws.onerror = () => ws?.close();
    }

    connect();

    return () => {
      dead = true;
      wsConnected.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled]);

  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (wsConnected.current) return;

      if (e.key === "Enter") {
        const barcode = scanBuffer.current.trim();
        scanBuffer.current = "";
        if (scanTimer.current) clearTimeout(scanTimer.current);
        if (barcode) onBarcodeRef.current(barcode);
        return;
      }

      if (e.key.length === 1) {
        scanBuffer.current += e.key;
        if (scanTimer.current) clearTimeout(scanTimer.current);
        scanTimer.current = setTimeout(() => {
          scanBuffer.current = "";
        }, 300);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (scanTimer.current) clearTimeout(scanTimer.current);
    };
  }, [enabled]);
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PosPage() {
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // ── Session state — derived live from hasSession(), never persisted ──────
  const { hasActiveSession, refresh: refreshSession } = usePosSession();

  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);

  // ── Receipt dialog ───────────────────────────────────────────────────────────
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SaleReceipt | null>(null);
  const [lastReceiptCreatedAt, setLastReceiptCreatedAt] = useState<string>("");

  const { page, setPage, resetToPage1 } = usePagination();
  const { search, debouncedSearch, handleSearch } = useSearch({
    onSearch: resetToPage1,
  });

  // ── Cart / order ─────────────────────────────────────────────────────────────

  const { setWalkInCustomer } = useUtilsStore();

  const {
    cart,
    customerId,
    setCustomerId,
    customerLabel,
    setCustomerLabel,
    inventoryId,
    inventoryLabel,
    setInventoryId,
    setInventoryLabel,
    addToCart,
    updateQuantity,
    removeFromCart,
    setItemQuantity,
    subtotal,
    tax,
    total,
    submitting,
    handlePay,
  } = usePosOrder({
    onSaleSuccess: (receipt, createdAt) => {
      loadInventoryRef.current(inventoryIdRef.current);
      setLastReceipt(receipt);
      setLastReceiptCreatedAt(createdAt);
      setReceiptDialogOpen(true);
      setMobileSheetOpen(false);
    },
  });

  const inventoryIdRef = useRef(inventoryId);
  useEffect(() => {
    inventoryIdRef.current = inventoryId;
  }, [inventoryId]);

  // ── Load inventory products ───────────────────────────────────────────────────

  const loadInventory = useCallback((id: string) => {
    if (!id) {
      setAllProducts([]);
      setCategories([]);
      return;
    }
    setLoadingInventory(true);
    getPosInventory(id)
      .then((detail) => {
        setAllProducts(detail.products);
        const seen = new Set<string>();
        const cats: Category[] = [];
        detail.products.forEach((p) => {
          p.categories.forEach((c) => {
            if (!seen.has(c.id)) {
              seen.add(c.id);
              cats.push({ id: c.id, name: c.name });
            }
          });
        });
        setCategories(cats);
        setSelectedCategory("all");
        resetToPage1();
      })
      .catch(() => {
        setAllProducts([]);
        setCategories([]);
      })
      .finally(() => setLoadingInventory(false));
  }, []);

  const loadInventoryRef = useRef(loadInventory);
  useEffect(() => {
    loadInventoryRef.current = loadInventory;
  }, [loadInventory]);

  // ── On mount: restore inventory + ensure walk-in customer is always set ───────
  // customerId is seeded from the store inside usePosOrder, so it survives
  // refresh. If it's still empty (first ever visit), fetch the first customer
  // (walk-in) from the API and persist it to the store for all future visits.

  useEffect(() => {
    if (inventoryId) loadInventory(inventoryId);

    if (!customerId) {
      getCustomers({ page: 1, itemsPerPage: 10 })
        .then(({ data }) => {
          if (data.length > 0) {
            const c = data[0];
            setCustomerId(c.id);
            setCustomerLabel(c.name);
            // Persist walk-in so future sessions skip this API call
            setWalkInCustomer(c.id, c.name);
          }
        })
        .catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Stable refs for barcode handler ──────────────────────────────────────────

  const allProductsRef = useRef(allProducts);
  useEffect(() => {
    allProductsRef.current = allProducts;
  }, [allProducts]);

  const inventoryIdForScanRef = useRef(inventoryId);
  useEffect(() => {
    inventoryIdForScanRef.current = inventoryId;
  }, [inventoryId]);

  const addToCartRef = useRef(addToCart);
  useEffect(() => {
    addToCartRef.current = addToCart;
  }, [addToCart]);

  useBarcodeScanner({
    enabled: true,
    onBarcode: (barcode) => {
      if (!inventoryIdForScanRef.current) {
        toast.warning("Select an inventory before scanning");
        return;
      }
      const product = allProductsRef.current.find(
        (p) => (p.sequence ?? p.id) === barcode,
      );
      if (!product) {
        toast.warning(`Product not found: ${barcode}`);
        return;
      }
      addToCartRef.current(product);
    },
  });

  // ── Derived ───────────────────────────────────────────────────────────────────

  const cartQuantities = useMemo(
    () =>
      cart.reduce(
        (acc, i) => ({ ...acc, [i.id]: i.quantity }),
        {} as Record<string, number>,
      ),
    [cart],
  );

  const totalCartItems = cart.reduce((s, i) => s + i.quantity, 0);

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (selectedCategory !== "all") {
      result = result.filter((p) =>
        p.categories.some((c) => c.id === selectedCategory),
      );
    }
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((p) => p.name.toLowerCase().includes(q));
    }
    return result;
  }, [allProducts, selectedCategory, debouncedSearch]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredProducts.length / ITEMS_PER_PAGE),
  );
  const pagedProducts = filteredProducts.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleInventoryChange = (id: string, name: string) => {
    setInventoryId(id);
    setInventoryLabel(name);
    loadInventory(id);
  };

  const handleCustomerChange = (id: string, name: string) => {
    setCustomerId(id);
    setCustomerLabel(name);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    resetToPage1();
  };

  const handlePayAndClose = async () => {
    await handlePay();
    // receipt dialog + sheet close handled inside onSaleSuccess
  };

  // ── Session button helpers ────────────────────────────────────────────────────
  // Open   → clickable only when NO active session
  // Close  → clickable only when there IS an active session
  // Both are derived live from hasSession() via usePosSession(); there is no
  // local persistence of a session id anywhere on this page.

  const handleOpenSessionClick = () => {
    if (hasActiveSession) {
      toast.warning("A session is already open. Close it first.");
      return;
    }
    setOpenSessionOpen(true);
  };

  const handleCloseSessionClick = () => {
    if (!hasActiveSession) {
      toast.warning("No active session to close.");
      return;
    }
    setCloseSessionOpen(true);
  };

  // ── Session button shared styles ──────────────────────────────────────────────

  const openBtnClass = [
    "flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
    hasActiveSession
      ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
      : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  ].join(" ");

  const closeBtnClass = [
    "flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
    !hasActiveSession
      ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
  ].join(" ");

  // ── Exit + session row — shared between desktop and mobile ───────────────────

  const exitSessionRow = (
    <div className="flex-none flex items-center justify-between gap-2 mb-3">
      <Button
        onClick={() => navigate("/purchases")}
        className="flex items-center gap-1.5 h-9 px-3 rounded-xl transition-colors cursor-pointer"
        variant="default"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Exit POS
      </Button>

      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenSessionClick}
          disabled={hasActiveSession}
          className={openBtnClass}
        >
          <Unlock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open Session</span>
          <span className="sm:hidden">Open</span>
        </button>
        <button
          onClick={handleCloseSessionClick}
          disabled={!hasActiveSession}
          className={closeBtnClass}
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Close Session</span>
          <span className="sm:hidden">Close</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 p-2.5 overflow-hidden flex flex-col lg:flex-row gap-2.5">
      {/* ── Product list ── */}
      <div className="bg-white flex-1 rounded-lg min-w-0 flex flex-col h-full p-4 border border-gray-200">
        {/* ── Exit POS + Open/Close Session row (left / right) ── */}
        {exitSessionRow}

        {/* MOBILE: inventory picker */}
        <div className="lg:hidden flex-none mb-3">
          <PosInventoryCombobox
            value={inventoryId}
            label={inventoryLabel}
            onChange={handleInventoryChange}
          />
        </div>

        <div className="flex-none mb-2">
          <PosCategoryFilter
            categories={categories}
            selected={selectedCategory}
            onSelect={handleCategorySelect}
            searchQuery={search}
            onSearchChange={handleSearch}
          />
        </div>

        {/* Product results */}
        <div className="flex-1 overflow-y-auto py-1">
          {!inventoryId ? (
            <div className="flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <p className="text-base font-medium text-gray-600">
                No inventory selected
              </p>
              <p className="text-sm text-gray-400 mt-1">
                <span className="lg:hidden">
                  Select an inventory above to load products
                </span>
                <span className="hidden lg:inline">
                  Choose an inventory on the right to load products
                </span>
              </p>
            </div>
          ) : loadingInventory ? (
            <p className="text-center text-gray-400 py-16 text-sm">
              Loading products…
            </p>
          ) : (
            <PosProductList
              products={pagedProducts}
              cartQuantities={cartQuantities}
              onAdd={addToCart}
            />
          )}
        </div>

        {!loadingInventory && inventoryId && totalPages > 1 && (
          <div className="flex-none pt-3 border-t border-gray-100 mt-2">
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              className="py-0"
            />
          </div>
        )}
      </div>

      {/* ── DESKTOP: Order details (right panel) ── */}
      <div className="hidden lg:block max-w-[320px] xl:w-[400px] shrink-0 h-full overflow-hidden">
        <div className="bg-white rounded-lg h-full border border-gray-100 overflow-hidden">
          <PosOrderDetails
            inventoryId={inventoryId}
            inventoryLabel={inventoryLabel}
            onInventoryChange={handleInventoryChange}
            customerId={customerId}
            customerLabel={customerLabel}
            onCustomerChange={handleCustomerChange}
            cart={cart}
            onUpdateQuantity={updateQuantity}
            onSetQuantity={setItemQuantity}
            onRemoveItem={removeFromCart}
            subtotal={subtotal}
            tax={tax}
            total={total}
            submitting={submitting}
            onPay={handlePay}
          />
        </div>
      </div>

      {/* ── MOBILE: Floating cart button ── */}
      <div className="lg:hidden fixed bottom-6 right-4 z-40">
        <button
          onClick={() => setMobileSheetOpen(true)}
          className="relative flex items-center gap-2.5 bg-black text-white pl-4 pr-5 py-3 rounded-2xl shadow-xl active:scale-95 transition-transform"
        >
          <ShoppingCart className="w-5 h-5" />
          <span className="text-sm font-semibold">
            {totalCartItems > 0 ? `Order (${totalCartItems})` : "Order"}
          </span>
          {totalCartItems > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 text-white text-[11px] font-bold flex items-center justify-center shadow">
              {totalCartItems}
            </span>
          )}
        </button>
      </div>

      {/* ── MOBILE: Bottom sheet ── */}
      {mobileSheetOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setMobileSheetOpen(false)}
          />
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90dvh]">
            <div className="relative flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-gray-100">
              <div className="w-10 h-1 rounded-full bg-gray-200 absolute left-1/2 -translate-x-1/2 top-2" />
              <h2 className="text-base font-semibold text-gray-900">
                Order Details
              </h2>
              <button
                onClick={() => setMobileSheetOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <PosOrderDetails
                inventoryId={inventoryId}
                inventoryLabel={inventoryLabel}
                onInventoryChange={handleInventoryChange}
                customerId={customerId}
                customerLabel={customerLabel}
                onCustomerChange={handleCustomerChange}
                cart={cart}
                onUpdateQuantity={updateQuantity}
                onSetQuantity={setItemQuantity}
                onRemoveItem={removeFromCart}
                subtotal={subtotal}
                tax={tax}
                total={total}
                submitting={submitting}
                onPay={handlePayAndClose}
              />
            </div>
          </div>
        </>
      )}

      {/* ── Session dialogs ── */}
      <OpenSessionDialog
        open={openSessionOpen}
        onOpenChange={setOpenSessionOpen}
        onSuccess={() => {
          // Re-check session status from the API — nothing is persisted locally
          refreshSession();
        }}
      />
      <CloseSessionDialog
        open={closeSessionOpen}
        onOpenChange={(isOpen) => {
          setCloseSessionOpen(isOpen);
        }}
        onSuccess={() => {
          // Re-check session status from the API — nothing is persisted locally
          refreshSession();
        }}
      />

      {/* ── Receipt dialog ── */}
      <PosReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receipt={lastReceipt}
        createdAt={lastReceiptCreatedAt}
      />
    </div>
  );
}
