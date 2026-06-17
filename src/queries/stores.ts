import api from "@/lib/axios";

export const getStores = () => api.get("/stores");
export const getStore = (id: string) => api.get(`/stores/${id}`);
export const createStore = (data: unknown) => api.post("/stores", data);
export const updateStore = (id: string, data: unknown) =>
  api.put(`/stores/${id}`, data);
export const deleteStore = (id: string) => api.delete(`/stores/${id}`);
