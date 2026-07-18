import { describe, expect, it } from "vitest";
import { purchaseFormSchema } from "./components/purchase-form-schema";
import {
  canAddPurchasePayment,
  paidPurchaseAmount,
  paymentStatusForInstallment,
  purchaseItemsTotal,
} from "./purchase-utils";

describe("purchase money and payment helpers", () => {
  it("rounds item totals to two decimal places", () => {
    expect(
      purchaseItemsTotal([
        { quantity: 3, unitPrice: 19.995 },
        { quantity: 1, unitPrice: 0.1 },
      ]),
    ).toBe(60.09);
  });

  it("derives paid amount from the backend remaining balance", () => {
    expect(
      paidPurchaseAmount({ totalPrice: 1000, remainingBalance: 299.995 }),
    ).toBe(700.01);
  });

  it("marks the final installment as fully paid", () => {
    expect(paymentStatusForInstallment(200, 700)).toBe("partially_paid");
    expect(paymentStatusForInstallment(700, 700)).toBe("fully_paid");
  });

  it("allows an unpaid Done purchase to receive an installment", () => {
    expect(
      canAddPurchasePayment({
        status: "Done",
        paymentStatus: "unpaid",
        remainingBalance: 100,
      }),
    ).toBe(true);
  });

  it("does not allow payments on cancelled or fully paid purchases", () => {
    expect(
      canAddPurchasePayment({
        status: "Cancelled",
        paymentStatus: "partially_paid",
        remainingBalance: 50,
      }),
    ).toBe(false);
    expect(
      canAddPurchasePayment({
        status: "Done",
        paymentStatus: "fully_paid",
        remainingBalance: 0,
      }),
    ).toBe(false);
  });
});

describe("purchase form validation", () => {
  const valid = {
    customerId: "supplier-1",
    purchaseDate: "2026-07-18",
    paymentStatus: "unpaid" as const,
    amount: 0,
    items: [
      {
        productId: "product-1",
        productName: "Rice",
        quantity: 1.5,
        unitPrice: 0,
      },
    ],
  };

  it("accepts a zero unit price and a non-integer positive quantity", () => {
    expect(purchaseFormSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects duplicate product rows", () => {
    const result = purchaseFormSchema.safeParse({
      ...valid,
      items: [
        valid.items[0],
        { ...valid.items[0], productName: "Rice duplicate" },
      ],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("already selected");
    }
  });
});
