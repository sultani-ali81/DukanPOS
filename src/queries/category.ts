import api from "@/lib/axios";

export interface CategoriesQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
}

export interface CategoriesMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount: number;
}

export const getCategories = async (query: CategoriesQuery = {}) => {
  const res = await api.get("/categories", { params: query });
  return res.data as {
    data: { id: string; name: string }[];
    meta: CategoriesMeta;
  };
};

export const createCategory = async (data: { name: string }) => {
  const res = await api.post("/categories", data);
  return res.data;
};

export const updateCategory = async (id: string, data: { name: string }) => {
  const res = await api.put(`/categories/${id}`, data);
  return res.data;
};

export const deleteCategory = async (id: string) => {
  const res = await api.delete(`/categories/${id}`);
  return res.data;
};
