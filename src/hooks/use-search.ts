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

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onSearch?.();
  }, [debouncedSearch]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const clearSearch = () => {
    setSearch("");
  };

  return { search, debouncedSearch, handleSearch, clearSearch };
}
