import api from "@/lib/axios";

import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UsersMeta,
} from "@/types/user";

// ── List ──────────────────────────────────────────────────────────────────────

export interface UsersQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
  role?: string;
}

type ApiUser = Omit<User, "name" | "firstName" | "lastName"> & {
  name?: string;
  firstName?: string;
  firstname?: string;
  lastName?: string;
  lastname?: string;
};

function normalizeUser(raw: ApiUser): User {
  const firstName = raw.firstName ?? raw.firstname ?? "";
  const lastName = raw.lastName ?? raw.lastname ?? "";
  const name =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    raw.name?.trim() ||
    raw.email ||
    "Unknown user";

  return { ...raw, firstName, lastName, name };
}

export function usersKey(params: UsersQuery = {}) {
  const { search = "", page = 1, itemsPerPage = 15, role = "" } = params;
  return `/employees?search=${search}&page=${page}&itemsPerPage=${itemsPerPage}&role=${role}`;
}

export const getUsers = (
  query: UsersQuery = {},
): Promise<{ data: User[]; meta: UsersMeta }> =>
  api.get("/employees", { params: query }).then((r) => {
    const raw = r.data;
    const items: ApiUser[] = Array.isArray(raw)
      ? raw
      : (raw.data ?? raw.employees ?? []);
    const meta: UsersMeta = raw.meta ?? {
      currentPage: 1,
      itemsPerPage: items.length,
      totalItems: items.length,
      totalPages: 1,
    };
    return { data: items.map(normalizeUser), meta };
  });

// ── Single → GET /employees/:id ─────────────────────────────────────────────

export const getUser = (id: string): Promise<User> =>
  api.get(`/employees/${id}`).then((r) => normalizeUser(r.data));

// ── Current user → GET /employees/me ─────────────────────────────────────────

export const getMe = (): Promise<User> =>
  api.get("/employees/me").then((r) => normalizeUser(r.data));

// ── Create → POST /employees/register ────────────────────────────────────────

export const createUser = (
  payload: CreateUserPayload,
): Promise<{ message: string }> =>
  api.post("/employees/register", payload).then((r) => r.data);

// ── Update → PUT /employees/info ─────────────────────────────────────────────
// Pass id in the body — backend uses dto.id if present, else falls back to JWT user

export const updateUser = (
  id: string,
  payload: UpdateUserPayload,
): Promise<{ message: string }> =>
  api.put("/employees/info", { ...payload, id }).then((r) => r.data);

// ── Delete → DELETE /employees/:id ────────────────────────────────────────────
// TODO: backend needs DELETE /employees/:id route exposed in the controller

export const deleteUser = (id: string): Promise<{ message: string }> =>
  api.delete(`/employees/${id}`).then((r) => r.data);

// ── Delete profile picture → DELETE /employees/profile-pic ───────────────────
// Note: the backend has no delete-employee endpoint, only profile picture removal

export const deleteProfilePicture = (): Promise<{ message: string }> =>
  api.delete("/employees/profile-pic").then((r) => r.data);
