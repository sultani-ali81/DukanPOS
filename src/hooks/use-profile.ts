import { extractError } from "@/lib/error";
import { getEmployeeProfile } from "@/queries/employee";
import type { EmployeeInfo } from "@/types/index";
import useSWR from "swr";

export function useProfile() {
  const { data, isLoading, error, mutate } = useSWR<EmployeeInfo>(
    "/employees/me",
    getEmployeeProfile,
    { revalidateOnFocus: false },
  );

  return {
    profile: data,
    isLoading,
    fetchError: error ? extractError(error, "Failed to load profile") : null,
    mutate,
  };
}
