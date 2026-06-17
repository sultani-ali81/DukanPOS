import api from "@/lib/axios";

import type {
  CreateCustomerPayload,
  Customer,
  GetCustomersParams,
  PaginatedCustomers,
  UpdateCustomerPayload,
} from "@/types/customer";

export async function getCustomers(
  params: GetCustomersParams = {},
): Promise<PaginatedCustomers> {
  const { search, page = 1, itemsPerPage = 15 } = params;

  const res = await api.get("/customer", {
    params: {
      ...(search ? { search } : {}),
      page,
      itemsPerPage,
    },
  });

  // Normalize in case backend shape shifts
  const raw = res.data;
  return {
    data: Array.isArray(raw?.data) ? raw.data : [],
    meta: raw?.meta ?? { total: 0, page, itemsPerPage, totalPages: 0 },
  };
}

// SWR key factory — keeps cache keys consistent and type-safe
export function customersKey(params: GetCustomersParams = {}) {
  const { search = "", page = 1, itemsPerPage = 15 } = params;
  return `/customer?search=${search}&page=${page}&itemsPerPage=${itemsPerPage}`;
}

export async function createCustomer(
  payload: CreateCustomerPayload,
): Promise<Customer> {
  const res = await api.post("/customer", payload);
  return res.data;
}

export async function updateCustomer(
  id: string,
  payload: UpdateCustomerPayload,
): Promise<Customer> {
  const res = await api.put(`/customer/${id}`, payload);
  return res.data;
}

export async function deleteCustomer(id: string): Promise<void> {
  await api.delete(`/customer/${id}`);
}
