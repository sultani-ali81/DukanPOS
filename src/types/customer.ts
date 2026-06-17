export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  address: string;
}

export interface UpdateCustomerPayload {
  name: string;
  phone: string;
  address: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  totalCount: number;
  itemsPerpage: number;
  totalPages: number;
}

export interface PaginatedCustomers {
  data: Customer[];
  meta: PaginationMeta;
}

export interface GetCustomersParams {
  search?: string;
  page?: number;
  itemsPerPage?: number;
}
