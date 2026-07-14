import api from "@/lib/axios";

export const getStores = (): Promise<unknown> =>
  api.get<unknown>("/stores").then((response) => response.data);
export const getStore = (id: string): Promise<unknown> =>
  api.get<unknown>(`/stores/${id}`).then((response) => response.data);
export const createStore = (data: unknown): Promise<unknown> =>
  api.post<unknown>("/stores", data).then((response) => response.data);
export const updateStore = (id: string, data: unknown) =>
  api.put<unknown>(`/stores/${id}`, data).then((response) => response.data);
export const deleteStore = (id: string): Promise<unknown> =>
  api.delete<unknown>(`/stores/${id}`).then((response) => response.data);
