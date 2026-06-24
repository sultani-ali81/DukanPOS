import { useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

interface UseSearchOptions {
  debounceMs?: number;
  onSearch?: () => void;
}

export function useSearch({
  debounceMs = 400,
  onSearch,
}: UseSearchOptions = {}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, debounceMs);

  const prevDebouncedRef = useRef(debouncedSearch);

  useEffect(() => {
    if (debouncedSearch === prevDebouncedRef.current) return;
    prevDebouncedRef.current = debouncedSearch;
    onSearch?.();
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return { search, debouncedSearch, handleSearch, clearSearch };
}
