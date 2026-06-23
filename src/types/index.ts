export interface Login {
  email: string;
  password: string;
  code?: string;
}

export interface Register {
  email: string;
  password: string;
  name: string;
  phone: string;
  storeName: string;
}

export interface Verify {
  email: string;
  code: string;
}

export interface EditProfile {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  imageUrl: string;
  gender: string;
  dob: string;
  storeName: string;
  oldPassword?: string;
  password?: string;
  attachmentId?: string;
}
export interface EmployeeInfo {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  phone: string;
  imageUrl: string;
  gender: string;
  dob: string;
  createdAt?: string;
  storeName: string;
  oldPassword?: string;
  password?: string;
  attachmentId?: string;
  twoFactorEnabled: boolean;
}

export interface OrderFoodPayload {
  serviceType?: string;
  name?: string;
  quantity?: number;
  description?: string;
}

export type StockStatus = "In Stock" | "Low Stock" | "Out of Stock";

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  price: number;
  status: StockStatus;
  lastUpdated: string;
}

export interface Category {
  id: string;
  name: string;
}
