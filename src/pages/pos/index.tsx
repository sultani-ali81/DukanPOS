import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Pagination } from "@/components/ui/pagination";
import { usePagination } from "@/hooks/use-pagination";
import { useAuthStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useUtilsStore } from "@/lib/utilsStore";
import { getCustomers } from "@/queries/customer";
import type { PosProduct } from "@/queries/pos-inventory";
import { getPosInventory } from "@/queries/pos-inventory";
import type { Category } from "@/types";
import type { SalePaymentStatus, SaleReceipt } from "@/types/sale";
import {
  ArrowLeft,
  ArrowLeftRight,
  Lock,
  LogOut,
  ShoppingCart,
  Unlock,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useBlocker, useNavigate } from "react-router";
import { toast } from "sonner";
import useSWR from "swr";
import { PosCashMovementDialog } from "./components/pos-cash-movement-dialog";
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

const ITEMS_PER_PAGE = 20;
const WALK_IN_CUSTOMER_NAME = /^walk[\s-]?in customer$/i;
const EMPTY_POS_PRODUCTS: PosProduct[] = [];

function posInventoryKey(inventoryId: string, page: number) {
  return [
    "pos-inventory",
    inventoryId,
    { page, itemsPerPage: ITEMS_PER_PAGE },
  ] as const;
}

async function findWalkInCustomer(
  persistedId: string,
  persistedLabel: string,
) {
  if (persistedId && persistedLabel) {
    const persistedResult = await getCustomers({
      search: persistedLabel,
      page: 1,
      itemsPerPage: 100,
    });
    const persistedWalkIn = persistedResult.data.find(
      (customer) =>
        customer.id === persistedId &&
        WALK_IN_CUSTOMER_NAME.test(customer.name.trim()),
    );
    if (persistedWalkIn) return persistedWalkIn;
  }

  const result = await getCustomers({
    search: "Walk-in Customer",
    page: 1,
    itemsPerPage: 100,
  });
  return (
    result.data.find((customer) =>
      WALK_IN_CUSTOMER_NAME.test(customer.name.trim()),
    ) ?? null
  );
}

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

  const scanBuffer = useRef("");

  const scanTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;

      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

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

export default function PosPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const isCashier = user?.role === "Cashier";

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);

  // ── Session state — derived live from hasSession(), never persisted ──────
  const {
    hasActiveSession,
    checkingSession,
    sessionError,
    refresh: refreshSession,
  } = usePosSession();
  const sessionUnavailable = checkingSession || Boolean(sessionError);

  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);

  // ── Cash movement dialog ──────────────────────────────────────────────────
  const [cashMovementOpen, setCashMovementOpen] = useState(false);

  // ── Receipt dialog ───────────────────────────────────────────────────────────
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<SaleReceipt | null>(null);
  const [lastReceiptCreatedAt, setLastReceiptCreatedAt] = useState<string>("");
  const [lastSaleId, setLastSaleId] = useState("");
  const [lastPaymentStatus, setLastPaymentStatus] =
    useState<SalePaymentStatus>("fully_paid");
  const [lastPaymentAmount, setLastPaymentAmount] = useState(0);

  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: ITEMS_PER_PAGE,
    pageParam: "posProductPage",
  });
  // ── Cart / order ─────────────────────────────────────────────────────────────

  const setWalkInCustomer = useUtilsStore((state) => state.setWalkInCustomer);

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
    clearCart,
    subtotal,
    tax,
    total,
    paymentStatus,
    setPaymentStatus,
    isWalkInCustomer,
    partialPaymentAmount,
    setPartialPaymentAmount,
    partialPaymentError,
    amountDueNow,
    submitting,
    handlePay,
  } = usePosOrder({
    hasActiveSession,
    checkingSession: sessionUnavailable,
    onSaleSuccess: (receipt, createdAt, sale) => {
      setLastReceipt(receipt);
      setLastReceiptCreatedAt(createdAt ?? new Date().toISOString());
      setLastSaleId(sale.saleId);
      setLastPaymentStatus(sale.paymentStatus);
      setLastPaymentAmount(sale.amount);
      setReceiptDialogOpen(true);
      setMobileSheetOpen(false);
    },
  });
  const cartNavigationBlocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      cart.length > 0 && currentLocation.pathname !== nextLocation.pathname,
  );

  // ── Load inventory products ───────────────────────────────────────────────────
  const {
    data: inventoryData,
    isLoading: inventoryLoading,
    isValidating: inventoryValidating,
  } = useSWR(
    inventoryId ? posInventoryKey(inventoryId, page) : null,
    ([, id, params]) => getPosInventory(id, params),
    {
      onSuccess: (detail) => {
        const totalPages = detail.productsMeta.totalPages;
        if (totalPages > 0 && page > totalPages) setPage(totalPages);
      },
      onError: () => toast.error("Failed to load inventory products."),
    },
  );

  const allProducts = inventoryData?.products ?? EMPTY_POS_PRODUCTS;
  const inventoryTotalPages = inventoryData?.productsMeta.totalPages ?? 0;
  const loadingInventory = inventoryLoading || inventoryValidating;
  const categories = useMemo(() => {
    const seen = new Set<string>();
    const result: Category[] = [];
    allProducts.forEach((product) => {
      product.categories.forEach((category) => {
        if (!seen.has(category.id)) {
          seen.add(category.id);
          result.push({ id: category.id, name: category.name });
        }
      });
    });
    return result;
  }, [allProducts]);

  // ── On mount: revalidate the persisted walk-in customer for this store ───────
  const [initialCustomer] = useState(() => ({
    id: customerId,
    label: customerLabel,
  }));
  useSWR(
    ["pos-walk-in-customer", initialCustomer.id, initialCustomer.label],
    ([, persistedId, persistedLabel]) =>
      findWalkInCustomer(persistedId, persistedLabel),
    {
      revalidateOnFocus: false,
      onSuccess: (walkInCustomer) => {
        if (walkInCustomer) {
          setCustomerId(walkInCustomer.id);
          setCustomerLabel(walkInCustomer.name);
          setWalkInCustomer(walkInCustomer.id, walkInCustomer.name);
        } else {
          setCustomerId("");
          setCustomerLabel("");
          setWalkInCustomer("", "");
        }
      },
      onError: () => {
        setCustomerId("");
        setCustomerLabel("");
        setWalkInCustomer("", "");
      },
    },
  );

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
        toast.warning(
          `Product ${barcode} is not on this page. Try another product page.`,
        );
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

  useEffect(() => {
    if (cart.length === 0) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = true;
    };
    window.addEventListener("beforeunload", warnBeforeLeaving);
    return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
  }, [cart.length]);

  const filteredProducts = useMemo(() => {
    let result = allProducts;
    if (inventoryTotalPages <= 1 && selectedCategory !== "all") {
      result = result.filter((p) =>
        p.categories.some((c) => c.id === selectedCategory),
      );
    }
    return result;
  }, [allProducts, inventoryTotalPages, selectedCategory]);

  const totalPages = inventoryTotalPages;
  const pagedProducts = filteredProducts;

  // ── Handlers ──────────────────────────────────────────────────────────────────

  const handleInventoryChange = (id: string, name: string) => {
    if (id === inventoryId) return;
    if (
      cart.length > 0 &&
      !window.confirm(
        "Changing inventory will clear the current cart. Continue?",
      )
    ) {
      return;
    }
    clearCart();
    setSelectedCategory("all");
    setInventoryId(id);
    setInventoryLabel(name);
    resetToPage1();
  };

  const handleCustomerChange = (id: string, name: string) => {
    setCustomerId(id);
    setCustomerLabel(name);
  };

  const handleCategorySelect = (id: string) => {
    setSelectedCategory(id);
    if (page !== 1) setPage(1);
  };

  const handleProductPageChange = (nextPage: number) => {
    setPage(nextPage);
  };

  const handleExitPos = () => {
    if (isCashier) {
      if (cart.length > 0) {
        setLogoutConfirmationOpen(true);
        return;
      }

      logout();
      navigate("/", { replace: true });
      return;
    }

    navigate("/sales");
  };

  const confirmCashierLogout = () => {
    clearCart();
    setLogoutConfirmationOpen(false);
    logout();
    navigate("/", { replace: true });
  };

  // ── Session button helpers ────────────────────────────────────────────────────

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

  const handleCashMovementClick = () => {
    if (!hasActiveSession) {
      toast.warning("Open a session before recording cash movements.");
      return;
    }
    setCashMovementOpen(true);
  };

  // ── Button styles ─────────────────────────────────────────────────────────────

  const openBtnClass = cn(
    "flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
    hasActiveSession || sessionError
      ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
      : "border-green-200 bg-green-50 text-green-700 hover:bg-green-100",
  );

  const closeBtnClass = cn(
    "flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
    !hasActiveSession
      ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
      : "border-red-200 bg-red-50 text-red-600 hover:bg-red-100",
  );

  const cashMovementBtnClass = cn(
    "flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
    !hasActiveSession
      ? "border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed"
      : "border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100",
  );

  // ── Exit + session row — shared between desktop and mobile ───────────────────

  const exitSessionRow = (
    <div className="flex-none flex items-center justify-between gap-2 mb-3">
      <Button
        onClick={handleExitPos}
        className="flex items-center gap-1.5 h-9 px-3 rounded-xl transition-colors cursor-pointer"
        variant="default"
      >
        {isCashier ? (
          <LogOut className="w-3.5 h-3.5" />
        ) : (
          <ArrowLeft className="w-3.5 h-3.5" />
        )}
        {isCashier ? "Log Out" : "Exit POS"}
      </Button>

      <div className="flex items-center gap-2">
        <button
          onClick={handleOpenSessionClick}
          disabled={hasActiveSession || Boolean(sessionError)}
          className={openBtnClass}
        >
          <Unlock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Open Session</span>
          <span className="sm:hidden">Open</span>
        </button>

        <button
          onClick={handleCashMovementClick}
          disabled={!hasActiveSession}
          className={cashMovementBtnClass}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Cash Movement</span>
          <span className="sm:hidden">Cash</span>
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
    <div className="fixed inset-0 flex flex-col gap-2 overflow-hidden bg-gray-300 p-1.5 sm:gap-2.5 sm:p-2.5 lg:flex-row">
      {/* ── Product list ── */}
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white p-2.5 sm:p-4">
        {/* ── Exit POS + Open/Close Session row (left / right) ── */}
        {exitSessionRow}

        {sessionError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {sessionError}
          </div>
        )}

        {/* MOBILE: inventory picker */}
        <div className="lg:hidden flex-none mb-3">
          <PosInventoryCombobox
            value={inventoryId}
            label={inventoryLabel}
            onChange={handleInventoryChange}
          />
        </div>

        {inventoryTotalPages <= 1 && categories.length > 0 && (
          <div className="flex-none mb-2">
            <PosCategoryFilter
              categories={categories}
              selected={selectedCategory}
              onSelect={handleCategorySelect}
            />
          </div>
        )}

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
              onPageChange={handleProductPageChange}
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
            paymentStatus={paymentStatus}
            onPaymentStatusChange={setPaymentStatus}
            isWalkInCustomer={isWalkInCustomer}
            partialPaymentAmount={partialPaymentAmount}
            onPartialPaymentAmountChange={setPartialPaymentAmount}
            partialPaymentError={partialPaymentError}
            amountDueNow={amountDueNow}
            hasActiveSession={hasActiveSession}
            checkingSession={sessionUnavailable}
            onOpenSession={handleOpenSessionClick}
            submitting={submitting}
            onPay={handlePay}
          />
        </div>
      </div>

      <Drawer open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
        {/* ── MOBILE: Floating cart button ── */}
        <div className="lg:hidden fixed bottom-6 right-4 z-40">
          <DrawerTrigger asChild>
            <button className="relative flex items-center gap-2.5 bg-black text-white pl-4 pr-5 py-3 rounded-2xl shadow-xl active:scale-95 transition-transform">
              <ShoppingCart className="w-5 h-5" />
              <span className="text-sm font-semibold">
                {totalCartItems > 0 ? `Order (${totalCartItems})` : "Order"}
              </span>
              {totalCartItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-blue-500 text-white text-caption font-bold flex items-center justify-center shadow">
                  {totalCartItems}
                </span>
              )}
            </button>
          </DrawerTrigger>
        </div>

        {/* ── MOBILE: Bottom sheet ── */}
        <DrawerContent className="lg:hidden max-h-[90dvh] rounded-t-3xl shadow-2xl">
          <DrawerHeader className="relative flex-row items-center justify-between border-b border-gray-100 px-5 pb-3 pt-3 text-left">
            <DrawerTitle className="text-base font-semibold text-gray-900">
              Order Details
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              Review the current order and complete payment.
            </DrawerDescription>
            <DrawerClose asChild>
              <button
                type="button"
                aria-label="Close order details"
                className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </DrawerClose>
          </DrawerHeader>
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
                paymentStatus={paymentStatus}
                onPaymentStatusChange={setPaymentStatus}
                isWalkInCustomer={isWalkInCustomer}
                partialPaymentAmount={partialPaymentAmount}
                onPartialPaymentAmountChange={setPartialPaymentAmount}
                partialPaymentError={partialPaymentError}
                amountDueNow={amountDueNow}
                hasActiveSession={hasActiveSession}
                checkingSession={sessionUnavailable}
                onOpenSession={handleOpenSessionClick}
                submitting={submitting}
                onPay={handlePay}
              />
            </div>
        </DrawerContent>
      </Drawer>

      {/* ── Session dialogs ── */}
      <AlertDialog
        open={logoutConfirmationOpen}
        onOpenChange={setLogoutConfirmationOpen}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogTitle>Log out and discard cart?</AlertDialogTitle>
          <AlertDialogDescription>
            You have items in this order. Logging out will remove the cart and
            its payment selections.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Stay in POS</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCashierLogout}>
              Discard and log out
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cartNavigationBlocker.state === "blocked"}
        onOpenChange={(open) => {
          if (!open && cartNavigationBlocker.state === "blocked") {
            cartNavigationBlocker.reset();
          }
        }}
      >
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogTitle>Discard the current cart?</AlertDialogTitle>
          <AlertDialogDescription>
            You have items in this order. Leaving POS will remove the cart and
            its payment selections.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel>Stay in POS</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cartNavigationBlocker.state === "blocked") {
                  cartNavigationBlocker.proceed();
                }
              }}
            >
              Discard and leave
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <OpenSessionDialog
        open={openSessionOpen}
        onOpenChange={setOpenSessionOpen}
        onSuccess={() => {
          refreshSession();
        }}
      />
      <CloseSessionDialog
        open={closeSessionOpen}
        onOpenChange={(isOpen) => {
          setCloseSessionOpen(isOpen);
        }}
        onSuccess={() => {
          refreshSession();
        }}
      />

      {/* ── Cash movement dialog ── */}
      <PosCashMovementDialog
        open={cashMovementOpen}
        onOpenChange={setCashMovementOpen}
      />

      {/* ── Receipt dialog ── */}
      <PosReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receipt={lastReceipt}
        createdAt={lastReceiptCreatedAt}
        saleId={lastSaleId}
        paymentStatus={lastPaymentStatus}
        paidAmount={lastPaymentAmount}
      />
    </div>
  );
}
