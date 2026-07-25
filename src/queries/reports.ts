import api from "@/lib/axios";
import { extractError } from "@/lib/error";
import type { ReportResponse, ReportType } from "@/types/reports";
import useSWR from "swr";

interface UseReportParams {
  type: ReportType;
  page: number;
  itemsPerPage: number;
}

export function useReport<T>({ type, page, itemsPerPage }: UseReportParams) {
  const key = ["reports", type, page, itemsPerPage];

  const { data, error, isLoading, mutate } = useSWR<ReportResponse<T>>(
    key,
    async () => {
      const res = await api.get("/reports", {
        params: { type, page, itemsPerPage },
      });
      return res.data;
    },
  );

  return {
    rows: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error: error ? extractError(error, "Failed to load report") : null,
    mutate,
  };
}
