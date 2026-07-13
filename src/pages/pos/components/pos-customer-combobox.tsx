import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCustomers } from "@/hooks/use-customers";
import { ChevronDown, Search, User } from "lucide-react";
import { useState } from "react";

interface PosCustomerComboboxProps {
  value: string;
  label: string;
  onChange: (id: string, name: string) => void;
}

export function PosCustomerCombobox({
  value,
  label,
  onChange,
}: PosCustomerComboboxProps) {
  const [open, setOpen] = useState(false);

  const {
    customers,
    totalPages,
    page,
    setPage,
    search,
    handleSearch,
    isLoading,
  } = useCustomers({ pageParam: "posCustomerPage" });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full h-11 justify-between rounded-xl border-gray-200 text-sm font-normal px-3"
        >
          <span className="flex items-center gap-2 truncate">
            <User className="w-4 h-4 text-gray-400 shrink-0" />
            <span className={value ? "text-gray-900" : "text-gray-400"}>
              {value ? label : "Select Customer"}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[280px] p-0 rounded-xl shadow-lg border border-gray-100"
        align="start"
      >
        {/* Search */}
        <div className="p-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search customer..."
              className="h-8 pl-8 rounded-lg text-sm border-gray-200"
            />
          </div>
        </div>

        {/* List */}
        <div className="max-h-52 overflow-y-auto py-1">
          {isLoading ? (
            <p className="text-xs text-gray-400 text-center py-6">Loading…</p>
          ) : customers.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">
              No customers found
            </p>
          ) : (
            customers.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange(c.id, c.name);
                  setOpen(false);
                }}
                className={[
                  "w-full text-left px-3 py-2 text-sm transition-colors hover:bg-gray-50",
                  value === c.id
                    ? "text-blue-600 font-medium bg-blue-50/50"
                    : "text-gray-700",
                ].join(" ")}
              >
                <span className="block font-medium truncate">{c.name}</span>
                {c.phone && (
                  <span className="block text-xs text-gray-400 truncate">
                    {c.phone}
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
              disabled={page <= 1 || isLoading}
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
              disabled={page >= totalPages || isLoading}
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
