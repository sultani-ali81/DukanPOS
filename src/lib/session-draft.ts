export const SESSION_DRAFT_TTL_MS = 10 * 60 * 1000;

type StoredSessionDraft<T> = {
  value: T;
  leftAt: number | null;
};

function storageAvailable() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function readSessionDraft<T>(key: string): T | null {
  if (!storageAvailable()) return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;

    const stored = JSON.parse(raw) as StoredSessionDraft<T>;
    if (
      stored.leftAt !== null &&
      Date.now() - stored.leftAt >= SESSION_DRAFT_TTL_MS
    ) {
      window.sessionStorage.removeItem(key);
      return null;
    }
    return stored.value;
  } catch {
    window.sessionStorage.removeItem(key);
    return null;
  }
}

export function writeSessionDraft<T>(key: string, value: T) {
  if (!storageAvailable()) return;
  const stored: StoredSessionDraft<T> = { value, leftAt: null };
  window.sessionStorage.setItem(key, JSON.stringify(stored));
}

export function markSessionDraftLeft(key: string) {
  if (!storageAvailable()) return;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return;
    const stored = JSON.parse(raw) as StoredSessionDraft<unknown>;
    window.sessionStorage.setItem(
      key,
      JSON.stringify({ ...stored, leftAt: Date.now() }),
    );
  } catch {
    window.sessionStorage.removeItem(key);
  }
}

export function clearSessionDraft(key: string) {
  if (!storageAvailable()) return;
  window.sessionStorage.removeItem(key);
}
