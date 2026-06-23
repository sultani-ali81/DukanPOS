import api from "@/lib/axios";
import type { CashMovementPayload } from "@/types/cash-movement";

export async function createCashMovement(
  payload: CashMovementPayload,
): Promise<{ message: string }> {
  const res = await api.post("/cash-movement", payload);
  return res.data;
}
