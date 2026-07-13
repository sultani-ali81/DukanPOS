import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui//popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePagination } from "@/hooks/use-pagination";
import { useSearch } from "@/hooks/use-search";
import type { Inventory } from "@/queries/inventory";
import { getInventories } from "@/queries/inventory";
import { ChevronDown, Search, Warehouse } from "lucide-react";
import { useEffect, useState } from "react";

const PAGE_SIZE = 8;

interface PosInventoryComboboxProps {
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
}

export function PosInventoryCombobox({
  value,
  label,
  onChange,
}: PosInventoryComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inventories, setInventories] = useState<Inventory[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  const { page, setPage, resetToPage1 } = usePagination({
    initialPage: 1,
    initialItemsPerPage: PAGE_SIZE,
    pageParam: "posInventoryPage",
  });
  const { search, debouncedSearch, handleSearch } = useSearch({
    onSearch: resetToPage1,
  });

  useEffect(() => {
    if (!open) return;
    // The popover owns this short-lived request state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getInventories({ search: debouncedSearch, page, itemsPerPage: PAGE_SIZE })
      .then(({ data, meta }) => {
        setInventories(data);
        setTotalPages(meta.totalPages);
      })
      .catch(() => setInventories([]))
      .finally(() => setLoading(false));
  }, [open, debouncedSearch, page]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 justify-between rounded-xl border-gray-200 text-sm font-normal px-3"
        >
          <span className="flex items-center gap-2 truncate">
            <Warehouse className="w-4 h-4 text-gray-400 shrink-0" />
            <span className={value ? "text-gray-900" : "text-gray-400"}>
              {value ? label : "Select Inventory"}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-0 rounded-xl bg-white border border-gray-100"
        align="start"
      >
        {/* Search */}
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search inventory..."
              className="h-8 pl-8 rounded-lg text-sm border-gray-200"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-52 overflow-y-auto py-1">
          {loading ? (
            <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
          ) : inventories.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No inventories found
            </p>
          ) : (
            inventories.map((inv) => (
              <button
                key={inv.id}
                onClick={() => {
                  onChange(inv.id, inv.name);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50",
                  value === inv.id
                    ? "text-blue-600 font-medium bg-blue-50/50"
                    : "text-gray-700",
                ].join(" ")}
              >
                <span className="block font-medium truncate">{inv.name}</span>
                {inv.address && (
                  <span className="block text-xs text-gray-400 truncate">
                    {inv.address}
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={page <= 1 || loading}
              onClick={() => setPage(page - 1)}
            >
              Prev
            </Button>
            <span className="text-xs text-gray-400">
              {page} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              disabled={page >= totalPages || loading}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
