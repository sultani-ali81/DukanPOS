import { hasSession } from "@/queries/session";
import { useCallback, useEffect, useState } from "react";

export function usePosSession() {
  const [hasActiveSession, setHasActiveSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const refresh = useCallback(() => {
    setCheckingSession(true);
    hasSession()
      .then((res) => setHasActiveSession(Boolean(res)))
      .catch(() => setHasActiveSession(false))
      .finally(() => setCheckingSession(false));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { hasActiveSession, checkingSession, refresh };
}
