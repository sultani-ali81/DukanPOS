import { z } from "zod";

export const stockMovementItemSchema = z
  .object({
    productId: z.string().min(1, "Select a product"),
    productName: z.string().min(1),
    availableQty: z.number().nonnegative(),
    quantity: z.number().int("Quantity is required").positive("Must be > 0"),
  })
  .refine((item) => item.quantity <= item.availableQty, {
    message: "Exceeds available stock",
    path: ["quantity"],
  });

export const stockMovementFormSchema = z
  .object({
    sourceInventoryId: z.string().min(1, "Select a source inventory"),
    destinationInventoryId: z.string().min(1, "Select a destination inventory"),
    items: z.array(stockMovementItemSchema).min(1, "Add at least one item"),
  })
  .refine((data) => data.sourceInventoryId !== data.destinationInventoryId, {
    message: "Source and destination must be different",
    path: ["destinationInventoryId"],
  });

export type StockMovementFormValues = {
  sourceInventoryId: string;
  destinationInventoryId: string;
  items: {
    productId: string;
    productName: string;
    availableQty: number;
    quantity: number;
  }[];
};
