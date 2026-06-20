import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { getCustomers } from "@/queries/customer";
import type { PosProduct } from "@/queries/pos-inventory";
import { getPosInventory } from "@/queries/pos-inventory";
import type { Category } from "@/types";
import { ShoppingCart, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { PosCategoryFilter } from "./components/pos-category-filter";
import { PosInventoryCombobox } from "./components/pos-inventory-combobox";
import { PosOrderDetails } from "./components/pos-order-details";
import { PosProductList } from "./components/pos-product-list";
import { usePosOrder } from "./components/use-pos-order";

const ITEMS_PER_PAGE = 12;

// ── Barcode WebSocket hook ────────────────────────────────────────────────────
// Connects to the local Python barcode bridge (ws://localhost:8765).
// Automatically reconnects every 2 s if the connection drops.
// Falls back to the keyboard-buffer approach if WebSocket is unavailable.

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

  // Track whether WS is connected so the keyboard fallback knows when to kick in
  const wsConnected = useRef(false);

  // ── WebSocket path ──
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

      ws.onerror = () => {
        ws?.close();
      };
    }

    connect();

    return () => {
      dead = true;
      wsConnected.current = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [enabled]);

  // ── Keyboard fallback (works when WS is not yet connected) ──
  // Buffers keystrokes and flushes on Enter, same as before.
  // Ignored when an input/textarea/select has focus.
  const scanBuffer = useRef("");
  const scanTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Let real inputs handle their own keystrokes
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // If WS is live the Python bridge handles it — avoid double-firing
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
  const [allProducts, setAllProducts] = useState<PosProduct[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [customerLabel, setCustomerLabel] = useState("");

  const { page, setPage, resetToPage1 } = usePagination();
  const { search, debouncedSearch, handleSearch } = useSearch({
    onSearch: resetToPage1,
  });

  // ── Cart / order ─────────────────────────────────────────────────────────────

  const {
    cart,
    customerId,
    setCustomerId,
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
    onSaleSuccess: () => loadInventoryRef.current(inventoryIdRef.current),
  });

  // Refs so closures never go stale
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

  // ── On mount: restore inventory + pre-select walk-in customer ────────────────

  useEffect(() => {
    if (inventoryId) loadInventory(inventoryId);

    if (!customerId) {
      getCustomers({ page: 1, itemsPerPage: 10 })
        .then(({ data }) => {
          if (data.length > 0) {
            setCustomerId(data[0].id);
            setCustomerLabel(data[0].name);
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

  // ── Barcode scanner ───────────────────────────────────────────────────────────
  // Receives barcodes from the Python WebSocket bridge (ws://localhost:8765).
  // Falls back to keyboard buffering when the bridge is not running.

  useBarcodeScanner({
    enabled: true,
    onBarcode: (barcode) => {
      if (!inventoryIdForScanRef.current) {
        toast.warning("Select an inventory before scanning");
        return;
      }

      // Match by sequence (if set) or product id
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
    setMobileSheetOpen(false);
  };

  return (
    // CHANGE: Changed h-[calc(100vh-80px)] overflow-y-auto to fixed structural limits
    <div className="h-[calc(100vh-64px)] w-full overflow-hidden flex flex-col lg:flex-row bg-bg-main gap-4">
      {/* ── Product list ── */}
      {/* CHANGE: Removed space-y-3 & pb-24; added internal flex layouts to handle individual column scrolling */}
      <div className="bg-white flex-1 rounded-xl min-w-0 flex flex-col h-full overflow-hidden p-4 border border-gray-100 shadow-xs">
        {/* MOBILE: inventory picker always visible */}
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

        {/* CHANGE: Wrapped product results area into its own unique isolated scroll element */}
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

        {/* CHANGE: Placed pagination inside fixed non-scroll footer view */}
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
      {/* CHANGE: Cleaned up inner margins, hardcoded matching calculations, and fixed full height structure layout */}
      <div className="hidden lg:block w-[380px] xl:w-[420px] shrink-0 h-full overflow-hidden">
        <div className="bg-white rounded-xl h-full border border-gray-100 shadow-xs overflow-hidden">
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
    </div>
  );
}
