import api from "@/lib/axios";
import type { JournalEntry } from "@/types/journal";

export interface JournalsQuery {
  page?: number;
  itemsPerPage?: number;
  search?: string;
}

export interface JournalsMeta {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  totalCount: number;
}

export const getJournalEntries = (
  query: JournalsQuery = {},
): Promise<{ data: JournalEntry[]; meta: JournalsMeta }> =>
  api.get("/journal-entries", { params: query }).then((r) => {
    const raw = r.data;
    const items: JournalEntry[] = Array.isArray(raw) ? raw : (raw.data ?? []);
    const meta: JournalsMeta = raw.meta ?? {
      currentPage: 1,
      itemsPerPage: items.length,
      totalItems: items.length,
      totalPages: 1,
      totalCount: items.length,
    };
    return { data: items, meta };
  });

export const getJournalEntry = (id: string): Promise<JournalEntry> =>
  api.get(`/journal-entries/${id}`).then((r) => r.data as JournalEntry);
