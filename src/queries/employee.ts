import api from "@/lib/axios";
import type { EditProfile, EmployeeInfo, Verify } from "@/types";

export const getEmployees = (): Promise<unknown> =>
  api.get<unknown>("/employees").then((response) => response.data);
export const getEmployee = (id: string): Promise<unknown> =>
  api.get<unknown>(`/employees/${id}`).then((response) => response.data);
export const getEmployeeProfile = (): Promise<EmployeeInfo> =>
  api.get<EmployeeInfo>("/employees/me").then((response) => response.data);
export const deleteEmployee = (id: string): Promise<unknown> =>
  api.delete<unknown>(`/employees/${id}`).then((response) => response.data);

export const updateEmployeeInfo = (payload: Partial<EditProfile>) =>
  api
    .put<unknown>("/employees/info", payload)
    .then((response) => response.data);

export const verifyEmployeeEmail = (payload: Verify) =>
  api
    .put<{ message: string }>("/employees/verify-employee-email", payload)
    .then((response) => response.data);

export const uploadEmployeeImage = (
  formData: FormData,
): Promise<{ id: string }> =>
  api
    .post("/attachments/upload/single", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

// ← add this
export const removeEmployeeImage = (): Promise<unknown> =>
  api
    .delete<unknown>("/employees/profile-pic")
    .then((response) => response.data);
