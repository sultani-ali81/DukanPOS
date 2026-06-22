import api from "@/lib/axios";
import type { EditProfile, Verify } from "@/types";

export const getEmployees = () => api.get("/employees");
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const deleteEmployee = (id: string) => api.delete(`/employees/${id}`);

export const updateEmployeeInfo = (payload: Partial<EditProfile>) =>
  api.put("/employees/info", payload);

export const verifyUpdatedEmail = (payload: Verify) =>
  api.post("/employees/verify-updated-email", payload);

export const uploadEmployeeImage = (
  formData: FormData,
): Promise<{ id: string }> =>
  api
    .post("/attachments/upload/single", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    })
    .then((r) => r.data);

// ← add this
export const removeEmployeeImage = () => api.delete("/employees/profile-pic");
