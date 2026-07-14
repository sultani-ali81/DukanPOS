import { extractError } from "@/lib/error";
import { hasSession } from "@/queries/session";
import useSWR from "swr";

export function usePosSession() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ["pos-session"],
    () => hasSession(),
  );

  const refresh = () => {
    void mutate();
  };

  return {
    hasActiveSession: Boolean(data),
    checkingSession: isLoading || isValidating,
    sessionError: error
      ? extractError(error, "Unable to verify the active POS session")
      : null,
    refresh,
  };
}
