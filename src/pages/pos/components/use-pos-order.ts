import { extractError } from "@/lib/error";
import { useUtilsStore } from "@/lib/utilsStore";
import type { PosProduct } from "@/queries/pos-inventory";
import { finalizeSale } from "@/queries/sale";
import type {
  CheckoutSaleRequest,
  SalePaymentStatus,
  SaleReceipt,
} from "@/types/sale";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";

export interface PosCartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

export interface CompletedSaleSnapshot {
  saleId: string;
  paymentStatus: SalePaymentStatus;
  amount: number;
}

interface UsePosOrderOptions {
  hasActiveSession?: boolean;
  checkingSession?: boolean;
  onSaleSuccess?: (
    receipt: SaleReceipt,
    createdAt: string | undefined,
    sale: CompletedSaleSnapshot,
  ) => void;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function hasAtMostTwoDecimals(value: string) {
  return /^(?:\d+|\d*\.\d{1,2})$/.test(value.trim());
}

export function usePosOrder({
  hasActiveSession = false,
  checkingSession = false,
  onSaleSuccess,
}: UsePosOrderOptions = {}) {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [paymentStatus, setPaymentStatus] =
    useState<SalePaymentStatus>("fully_paid");
  const [partialPaymentAmount, setPartialPaymentAmount] = useState("");
  const { mutate } = useSWRConfig();

  const {
    inventoryId,
    setInventoryId,
    inventoryLabel,
    setInventoryLabel,
    walkInCustomerId,
    walkInCustomerLabel,
  } = useUtilsStore();

  const [customerId, setCustomerId] = useState<string>(walkInCustomerId);
  const [customerLabel, setCustomerLabel] =
    useState<string>(walkInCustomerLabel);

  const addToCart = (product: PosProduct) => {
    if (!product.hasPrice) {
      toast.error("Set a selling price before adding this product.");
      return;
    }
    setCart((previous) => {
      const existing = previous.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.warning(`Only ${product.quantity} in stock`);
          return previous;
        }
        return previous.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      if (product.quantity <= 0) {
        toast.warning("This product is out of stock");
        return previous;
      }
      return [
        ...previous,
        {
          id: product.id,
          name: product.name,
          price: product.price,
          image: product.primaryImage,
          quantity: 1,
          stock: product.quantity,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((previous) =>
      previous
        .map((item) => {
          if (item.id !== productId) return item;
          const next = item.quantity + delta;
          if (next > item.stock) {
            toast.warning(`Only ${item.stock} in stock`);
            return item;
          }
          return { ...item, quantity: Math.max(0, next) };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const setItemQuantity = (productId: string, value: number) => {
    if (value <= 0) {
      setCart((previous) =>
        previous.filter((item) => item.id !== productId),
      );
      return;
    }
    setCart((previous) =>
      previous.map((item) => {
        if (item.id !== productId) return item;
        const clamped = Math.min(value, item.stock);
        if (value > item.stock) toast.warning(`Only ${item.stock} in stock`);
        return { ...item, quantity: clamped };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((previous) =>
      previous.filter((item) => item.id !== productId),
    );
  };

  const clearCart = () => setCart([]);

  const subtotal = roundMoney(
    cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
  );
  // Preserve the existing POS tax rule, but round each submitted unit price so
  // every monetary value satisfies the checkout contract.
  const checkoutItems = cart.map((item) => ({
    productId: item.id,
    quantity: item.quantity,
    unitPrice: roundMoney(item.price * 1.1),
  }));
  const total = roundMoney(
    checkoutItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    ),
  );
  const tax = roundMoney(total - subtotal);

  let partialPaymentError: string | null = null;
  const parsedPartialAmount = Number(partialPaymentAmount);
  if (paymentStatus === "partially_paid") {
    if (!partialPaymentAmount.trim()) {
      partialPaymentError = "Enter the amount received now.";
    } else if (
      !hasAtMostTwoDecimals(partialPaymentAmount) ||
      !Number.isFinite(parsedPartialAmount)
    ) {
      partialPaymentError = "Use a valid amount with at most 2 decimals.";
    } else if (parsedPartialAmount <= 0) {
      partialPaymentError = "A partial payment must be greater than zero.";
    } else if (parsedPartialAmount >= total) {
      partialPaymentError = "A partial payment must be less than the total.";
    }
  }

  const amountDueNow =
    paymentStatus === "fully_paid"
      ? total
      : paymentStatus === "unpaid" || partialPaymentError
        ? 0
        : roundMoney(parsedPartialAmount);

  const refreshRelatedData = () => {
    void mutate(
      (key) => {
        if (typeof key === "string") return key.startsWith("/sales");
        if (!Array.isArray(key)) return false;
        return key[0] === "dashboard" || key[0] === "inventory-detail";
      },
      undefined,
      { revalidate: true },
    );
  };

  const handlePay = async (): Promise<boolean> => {
    if (submittingRef.current) return false;
    if (checkingSession) {
      toast.error("Please wait while the active session is checked.");
      return false;
    }
    if (!hasActiveSession) {
      toast.error("Open a session before completing a sale.");
      return false;
    }
    if (!customerId) {
      toast.error("Please select a customer");
      return false;
    }
    if (!inventoryId) {
      toast.error("Please select an inventory");
      return false;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return false;
    }
    if (
      cart.some(
        (item) =>
          item.quantity <= 0 ||
          item.quantity > item.stock ||
          !Number.isFinite(item.price) ||
          item.price < 0,
      )
    ) {
      toast.error("Review item quantities and prices before checkout.");
      return false;
    }
    if (partialPaymentError) {
      toast.error(partialPaymentError);
      return false;
    }

    const payload: CheckoutSaleRequest = {
      customerId,
      inventoryId,
      paymentStatus,
      amount: amountDueNow,
      items: checkoutItems,
    };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const response = await finalizeSale(payload);
      toast.success(response.message || "Sale completed and stock updated");
      clearCart();
      setPaymentStatus("fully_paid");
      setPartialPaymentAmount("");
      refreshRelatedData();
      onSaleSuccess?.(response.receipt, response.createdAt, {
        saleId: response.saleId,
        paymentStatus,
        amount: amountDueNow,
      });
      return true;
    } catch (error: unknown) {
      toast.error(
        extractError(error, "Failed to complete sale. Please try again."),
      );
      return false;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return {
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
    setItemQuantity,
    removeFromCart,
    clearCart,
    subtotal,
    tax,
    total,
    paymentStatus,
    setPaymentStatus,
    partialPaymentAmount,
    setPartialPaymentAmount,
    partialPaymentError,
    amountDueNow,
    submitting,
    handlePay,
  };
}
