import api from "@/lib/axios";
import type { EmployeeInfo } from "@/types/index";
import useSWR from "swr";

const fetcher = (url: string) => api.get(url).then((res) => res.data);

export function useProfile() {
  const { data, isLoading, error, mutate } = useSWR<EmployeeInfo>(
    "/auth/me",
    fetcher,
    { revalidateOnFocus: false },
  );

  return { profile: data, isLoading, fetchError: error, mutate };
}
