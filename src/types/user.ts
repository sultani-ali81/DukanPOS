// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = "Cashier" | "Admin";

export type EmployeeGender = "male" | "female" | "Other";

// ── Shapes ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  firstName: string;
  name: string;
  lastName: string;
  phone?: string;
  email: string;
  role?: UserRole;
  gender?: EmployeeGender;
  dob?: string;
  createdAt?: string;
}

// ── Create payload → POST /employees/register ─────────────────────────────────
// confirmPassword is frontend-only validation — never sent to the API

export interface CreateUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  gender?: EmployeeGender;
  dob?: string;
}

// ── Update payload → PUT /employees/info ──────────────────────────────────────
// Pass id in body — backend uses dto.id if present, else falls back to JWT user

export interface UpdateUserPayload {
  id?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  role?: UserRole;
  gender?: EmployeeGender;
  dob?: string;
  // Password change — backend requires oldPassword to validate before updating
  oldPassword?: string;
  password?: string;
}

// ── Pagination meta ───────────────────────────────────────────────────────────

export interface UsersMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
}
