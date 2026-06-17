import api from "@/lib/axios";
import type {
  CreateStockInPayload,
  UpdateStockInPayload,
} from "@/types/purchases";

export const createStockIn = (
  payload: CreateStockInPayload,
): Promise<{ message: string }> =>
  api.post("/stock-in", payload).then((r) => r.data);

export const getStockIn = (id: string) =>
  api.get(`/stock-in/${id}`).then((r) => r.data);

export const updateStockIn = (
  id: string,
  payload: UpdateStockInPayload,
): Promise<{ message: string }> =>
  api.put(`/stock-in/${id}`, payload).then((r) => r.data);

export const updateStockInItem = (
  stockInId: string,
  purchasedItemId: string,
  payload: UpdateStockInPayload,
): Promise<{ message: string }> =>
  api
    .put(`/stock-in/${stockInId}/items/${purchasedItemId}`, payload)
    .then((r) => r.data);
