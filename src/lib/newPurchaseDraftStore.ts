// src/lib/newPurchaseDraftStore.ts
import type { FormValues } from "@/pages/purchases/components/purchase-form-schema";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const DRAFT_TTL_MS = 60 * 1000; // 1 minute — only counted while away from the page

type NewPurchaseDraft = {
  values: FormValues;
  customerDisplay: string;
  inventoryId: string;
  productDisplays: string[];
  leftAt: number | null; // set on unmount; null while the page is mounted
};

type NewPurchaseDraftState = {
  draft: NewPurchaseDraft | null;
  setDraft: (draft: Omit<NewPurchaseDraft, "leftAt">) => void;
  markLeft: () => void;
  clearDraft: () => void;
  /** Returns the draft only if the time since the user left is under the TTL. */
  getFreshDraft: () => NewPurchaseDraft | null;
};

export const useNewPurchaseDraftStore = create<NewPurchaseDraftState>()(
  persist(
    (set, get) => ({
      draft: null,

      setDraft: (draft) => {
        // Any edit means we're actively on the page — clear leftAt.
        set({ draft: { ...draft, leftAt: null } });
      },

      markLeft: () => {
        const current = get().draft;
        if (!current) return;
        set({ draft: { ...current, leftAt: Date.now() } });
      },

      clearDraft: () => {
        set({ draft: null });
      },

      getFreshDraft: () => {
        const draft = get().draft;
        if (!draft) return null;
        // leftAt === null means it was never marked as "left" (shouldn't normally
        // happen on a fresh mount, but treat as fresh rather than losing data).
        if (draft.leftAt !== null && Date.now() - draft.leftAt > DRAFT_TTL_MS) {
          set({ draft: null });
          return null;
        }
        return draft;
      },
    }),
    {
      name: "new-purchase-draft",
      storage: createJSONStorage(() => sessionStorage),
    },
  ),
);
