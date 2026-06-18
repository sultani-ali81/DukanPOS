import { useUtilsStore } from "@/lib/utilsStore";
import type { PosProduct } from "@/queries/pos-inventory";
import {
  completeStockOut,
  createSale,
  createStockOut,
  updateSale,
} from "@/queries/sale";
import { useState } from "react";
import { toast } from "sonner";

export interface PosCartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  stock: number;
}

interface UsePosOrderOptions {
  onSaleSuccess?: () => void;
}

export function usePosOrder({ onSaleSuccess }: UsePosOrderOptions = {}) {
  const [cart, setCart] = useState<PosCartItem[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const { inventoryId, setInventoryId, inventoryLabel, setInventoryLabel } =
    useUtilsStore();

  const addToCart = (product: PosProduct) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.warning(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      if (product.quantity === 0) {
        toast.warning("This product is out of stock");
        return prev;
      }
      return [
        ...prev,
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
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.id !== productId) return i;
          const next = i.quantity + delta;
          if (next > i.stock) {
            toast.warning(`Only ${i.stock} in stock`);
            return i;
          }
          return { ...i, quantity: Math.max(0, next) };
        })
        .filter((i) => i.quantity > 0),
    );
  };

  // Direct number input — clamps to stock, removes if 0
  const setItemQuantity = (productId: string, value: number) => {
    if (value <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => {
        if (i.id !== productId) return i;
        const clamped = Math.min(value, i.stock);
        if (value > i.stock) toast.warning(`Only ${i.stock} in stock`);
        return { ...i, quantity: clamped };
      }),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCustomerId("");
  };

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handlePay = async () => {
    if (!customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!inventoryId) {
      toast.error("Please select an inventory");
      return;
    }
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    setSubmitting(true);
    try {
      // Step 1 — create the sale (backend validates stock against this inventory)
      const sale = await createSale({
        customerId,
        inventoryId,
        items: cart.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          unitPrice: i.price + i.price * 0.1,
        })),
      });

      // Step 2 — create the stock-out record (status: Pending)
      const saleItemMap = new Map(
        sale.items.map((si) => [si.productId, si.id]),
      );

      await updateSale(sale.id);

      const stockOut = await createStockOut({
        saleId: sale.id,
        inventoryId,
        items: cart.map((i) => ({
          saleItemId: saleItemMap.get(i.id)!,
          quantity: i.quantity,
        })),
      });

      // Step 3 — complete the stock-out (status: Done → deducts StockQuantity)
      await completeStockOut(stockOut.id);

      toast.success("Sale completed and stock updated");
      clearCart();
      onSaleSuccess?.();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Failed to complete sale. Please try again.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    cart,
    customerId,
    setCustomerId,
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
    submitting,
    handlePay,
  };
}
