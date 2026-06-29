import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "Must contain one uppercase letter")
  .regex(/[^A-Za-z0-9]/, "Must contain one symbol");
