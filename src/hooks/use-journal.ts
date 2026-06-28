import { usePagination } from "@/hooks/use-pagination";

import { useSearch } from "@/hooks/use-search";

import { getJournalEntries, getJournalEntry } from "@/queries/journal";

import type { JournalEntry } from "@/types/journal";

import { useMemo, useState } from "react";

import useSWR from "swr";

const ITEMS_PER_PAGE = 20;

export interface JournalStats {
  totalEntries: number;

  totalAmount: number;

  thisMonthEntries: number;

  thisMonthAmount: number;

  pendingEntries: number;
}

export interface UseJournalsReturn {
  journals: JournalEntry[];

  loading: boolean;

  error: string | null;

  stats: JournalStats;

  // pagination

  page: number;

  totalPages: number;

  totalItems: number;

  itemsPerPage: number;

  goToPage: (page: number) => void;

  // search

  search: string;

  setSearch: (v: string) => void;

  clearSearch: () => void;

  searchOpen: boolean;

  setSearchOpen: (v: boolean) => void;

  // detail dialog

  detailOpen: boolean;

  selectedEntry: JournalEntry | null;

  detailLoading: boolean;

  openDetail: (je: JournalEntry) => void;

  closeDetail: () => void;
}

export function useJournals(): UseJournalsReturn {
  // ── Detail dialog ────────────────────────────────────────────────────────────

  const [detailOpen, setDetailOpen] = useState(false);

  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);

  // ── Pagination + search ──────────────────────────────────────────────────────

  const { page, goToPage, resetToPage1 } = usePagination({
    initialPage: 1,

    initialItemsPerPage: ITEMS_PER_PAGE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    debounceMs: 400,

    onSearch: resetToPage1,
  });

  // ── SWR list fetch ───────────────────────────────────────────────────────────

  // Key changes whenever page or debouncedSearch changes — SWR re-fetches automatically.

  const swrKey = ["journal-entries", page, debouncedSearch] as const;

  const {
    data,

    isLoading,

    error: swrError,
  } = useSWR(swrKey, ([, p, q]) =>
    getJournalEntries({
      page: p,

      itemsPerPage: ITEMS_PER_PAGE,

      search: q || undefined,
    }),
  );

  const journals = data?.data ?? [];

  const meta = data?.meta ?? {
    currentPage: 1,

    itemsPerPage: ITEMS_PER_PAGE,

    totalItems: 0,

    totalPages: 1,

    totalCount: 0,
  };

  const error: string | null = swrError
    ? (swrError?.response?.data?.message ??
      swrError?.message ??
      "Failed to load journal entries")
    : null;

  // ── Derived stats ────────────────────────────────────────────────────────────

  const stats = useMemo((): JournalStats => {
    const now = new Date();

    const thisMonth = journals.filter((je) => {
      if (!je.createdAt) return false;

      const d = new Date(je.createdAt);

      return (
        d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
      );
    });

    const totalAmount = journals.reduce((sum, je) => {
      const dr = je.items.find((i) => i.debit != null);

      return sum + (dr?.debit ?? 0);
    }, 0);

    const thisMonthAmount = thisMonth.reduce((sum, je) => {
      const dr = je.items.find((i) => i.debit != null);

      return sum + (dr?.debit ?? 0);
    }, 0);

    return {
      totalEntries: meta.totalCount || journals.length,

      totalAmount,

      thisMonthEntries: thisMonth.length,

      thisMonthAmount,

      pendingEntries: journals.filter((je) => je.status === "Pending").length,
    };
  }, [journals, meta]);

  // ── Detail open/close ────────────────────────────────────────────────────────

  const openDetail = (je: JournalEntry) => {
    setSelectedEntry(je);

    setDetailOpen(true);

    setDetailLoading(true);

    getJournalEntry(je.id)
      .then((detail) =>
        setSelectedEntry({
          // Preserve fields the list row has but the detail endpoint may omit

          // (e.g. createdAt) so the header keeps showing them after the

          // detail fetch completes.

          ...je,

          ...detail,

          createdAt: detail.createdAt ?? je.createdAt,
        }),
      )

      .catch(() => {})

      .finally(() => setDetailLoading(false));
  };

  const closeDetail = () => {
    setDetailOpen(false);

    setSelectedEntry(null);
  };

  return {
    journals,

    loading: isLoading,

    error,

    stats,

    page,

    totalPages: meta.totalPages,

    totalItems: meta.totalItems,

    itemsPerPage: ITEMS_PER_PAGE,

    goToPage,

    search,

    setSearch: handleSearch,

    clearSearch,

    searchOpen,

    setSearchOpen,

    detailOpen,

    selectedEntry,

    detailLoading,

    openDetail,

    closeDetail,
  };
}
