import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearSessionDraft,
  markSessionDraftLeft,
  readSessionDraft,
  SESSION_DRAFT_TTL_MS,
  writeSessionDraft,
} from "./session-draft";

const KEY = "test-session-draft";

describe("session drafts", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
  });

  it("restores a draft within ten minutes of leaving", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T10:00:00Z"));

    writeSessionDraft(KEY, { item: "Tea" });
    markSessionDraftLeft(KEY);
    vi.advanceTimersByTime(SESSION_DRAFT_TTL_MS - 1);

    expect(readSessionDraft(KEY)).toEqual({ item: "Tea" });
  });

  it("removes a draft after ten minutes away", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T10:00:00Z"));

    writeSessionDraft(KEY, { item: "Tea" });
    markSessionDraftLeft(KEY);
    vi.advanceTimersByTime(SESSION_DRAFT_TTL_MS);

    expect(readSessionDraft(KEY)).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it("does not expire a draft while its page remains active", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-27T10:00:00Z"));

    writeSessionDraft(KEY, { item: "Tea" });
    vi.advanceTimersByTime(SESSION_DRAFT_TTL_MS * 2);

    expect(readSessionDraft(KEY)).toEqual({ item: "Tea" });
  });

  it("clears a completed draft", () => {
    writeSessionDraft(KEY, { item: "Tea" });
    clearSessionDraft(KEY);
    expect(readSessionDraft(KEY)).toBeNull();
  });
});
