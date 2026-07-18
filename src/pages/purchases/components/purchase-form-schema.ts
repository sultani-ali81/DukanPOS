import { z } from "zod";
import type { PurchasePaymentStatus } from "@/types/purchases";

// ── Item schema ───────────────────────────────────────────────────────────────

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  productName: z.string().min(1),
  quantity: z.number().positive("Must be > 0").max(9999999, "Too large"),
  unitPrice: z.number().min(0, "Must be 0 or more"),
});

// ── Form schema ───────────────────────────────────────────────────────────────

export const purchaseFormSchema = z
  .object({
    customerId: z.string().min(1, "Select a supplier"),
    purchaseDate: z.string().min(1, "Select a date"),
    paymentStatus: z.enum(["unpaid", "partially_paid", "fully_paid"]),
    amount: z.number().min(0, "Must be 0 or more"),
    items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
  })
  .superRefine((values, context) => {
    const firstRowByProduct = new Map<string, number>();

    values.items.forEach((item, index) => {
      if (!item.productId) return;
      const firstIndex = firstRowByProduct.get(item.productId);
      if (firstIndex === undefined) {
        firstRowByProduct.set(item.productId, index);
        return;
      }

      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["items", index, "productId"],
        message: `This product is already selected in item ${firstIndex + 1}.`,
      });
    });
  });

// ── FormValues ────────────────────────────────────────────────────────────────
// Declared explicitly instead of z.infer so the resolver generic resolves
// cleanly — z.coerce fields infer as `unknown` which breaks Resolver<FormValues>.

export type FormValues = {
  customerId: string;
  purchaseDate: string;
  paymentStatus: PurchasePaymentStatus;
  amount: number;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
};
