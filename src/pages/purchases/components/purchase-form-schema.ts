import { z } from "zod";

// ── Item schema ───────────────────────────────────────────────────────────────

export const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Select a product"),
  productName: z.string().min(1),
  quantity: z.number().int().positive("Must be > 0").max(9999999, "Too large"),
  unitPrice: z.number().positive("Must be > 0"),
});

// ── Form schema ───────────────────────────────────────────────────────────────

export const purchaseFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  purchaseDate: z.string().min(1, "Select a date"),
  items: z.array(purchaseItemSchema).min(1, "Add at least one item"),
});

// ── FormValues ────────────────────────────────────────────────────────────────
// Declared explicitly instead of z.infer so the resolver generic resolves
// cleanly — z.coerce fields infer as `unknown` which breaks Resolver<FormValues>.

export type FormValues = {
  customerId: string;
  purchaseDate: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }[];
};
