import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import { getUsers, usersKey } from "@/queries/user";
import type { User } from "@/types/user";
import { useState } from "react";
import useSWR from "swr";

const PAGE_SIZE = 15;

export interface UseUsersReturn {
  users: User[];
  total: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  page: number;
  setPage: (page: number) => void;
  search: string;
  handleSearch: (value: string) => void;
  clearSearch: () => void;
  role: string;
  setRole: (role: string) => void;
  mutate: () => void;
  optimisticAdd: (user: User) => void;
  optimisticUpdate: (id: string, patch: Partial<User>) => void;
  optimisticDelete: (id: string) => void;
  isLoading: boolean;
  PAGE_SIZE: number;
}

export function useUsers(): UseUsersReturn {
  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
  });

  const { search, debouncedSearch, handleSearch, clearSearch } = useSearch({
    onSearch: resetToPage1,
  });

  const [role, setRole] = useState<string>("ALL");

  const swrKey = usersKey({
    search: debouncedSearch,
    page,
    itemsPerPage: PAGE_SIZE,
    role: role !== "ALL" ? role : undefined,
  });

  const { data, mutate, isLoading } = useSWR(swrKey, () =>
    getUsers({
      search: debouncedSearch,
      page,
      itemsPerPage: PAGE_SIZE,
      role: role !== "ALL" ? role : undefined,
    }),
  );

  // Optimistically add a user to the list without waiting for a refetch
  const optimisticAdd = (user: User) => {
    if (!data) return;
    mutate(
      {
        ...data,
        data: [user, ...data.data],
        meta: { ...data.meta, totalItems: data.meta.totalItems + 1 },
      },
      { revalidate: true },
    );
  };

  // Optimistically update a user in the list
  const optimisticUpdate = (id: string, patch: Partial<User>) => {
    if (!data) return;
    mutate(
      {
        ...data,
        data: data.data.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      },
      { revalidate: true },
    );
  };

  // Optimistically remove a user from the list
  const optimisticDelete = (id: string) => {
    if (!data) return;
    mutate(
      {
        ...data,
        data: data.data.filter((u) => u.id !== id),
        meta: {
          ...data.meta,
          totalItems: Math.max(0, data.meta.totalItems - 1),
        },
      },
      { revalidate: true },
    );
  };

  const totalItems = data?.meta?.totalItems ?? 0;
  const itemsPerPage = data?.meta?.itemsPerPage ?? PAGE_SIZE;

  return {
    users: data?.data ?? [],
    total: totalItems,
    totalItems,
    totalPages: data?.meta?.totalPages ?? 1,
    itemsPerPage,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    role,
    setRole,
    mutate,
    optimisticAdd,
    optimisticUpdate,
    optimisticDelete,
    isLoading,
    PAGE_SIZE,
  };
}
