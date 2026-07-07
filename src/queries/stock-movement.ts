import api from "@/lib/axios";
import type {
  CreateStockMovementPayload,
  StockMovementResponse,
  UpdateStockMovement,
} from "@/types/stock-movement";

export async function createStockMovement(
  payload: CreateStockMovementPayload,
): Promise<StockMovementResponse> {
  const response = await api.post("/stock-movement", payload);
  return response.data;
}

export async function updateStockMovement(
  payload: UpdateStockMovement,
  id: string,
): Promise<StockMovementResponse> {
  const response = await api.put(`/stock-movement/${id}`, payload);
  return response.data;
}
