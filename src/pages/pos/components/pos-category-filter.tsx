import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ChevronDown, Search } from "lucide-react";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
}

interface PosCategoryFilterProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function PosCategoryFilter({
  categories,
  selected,
  onSelect,
  searchQuery,
  onSearchChange,
}: PosCategoryFilterProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const all = [{ id: "all", name: "All" }, ...categories];
  const selectedName = all.find((c) => c.id === selected)?.name ?? "All";

  return (
    <>
      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex mb-3">
        <div className="relative w-full shrink-0">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search product..."
            className="w-full h-11 pl-10 pr-3 rounded-md border border-gray-200 bg-white text-sm outline-none focus:ring-2 focus:ring-black/10"
          />
          <Button className="absolute right-1 top-1/2 -translate-y-1/2 px-6">
            Search
          </Button>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 overflow-x-auto scrollbar-none">
          {all.map((cat) => (
            <Button
              key={cat.id}
              onClick={() => onSelect(cat.id)}
              className={[
                "shrink-0 h-9 px-4 rounded-lg text-sm font-medium border transition-colors",
                selected === cat.id
                  ? "bg-white border-blue-600 text-blue-600 hover:bg-blue-50"
                  : "bg-transparent border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-400 hover:border-blue-200",
              ].join(" ")}
            >
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* ── MOBILE ── */}
      <div className="lg:hidden space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search product..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-gray-200 bg-white text-sm"
            />
          </div>
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger>
            <Button className="flex items-center gap-1.5 h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-700 shrink-0">
              <span>{selectedName}</span>
              <ChevronDown size={13} className="text-gray-400" />
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl">
            <SheetHeader className="mb-5">
              <SheetTitle className="text-base">Select Category</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-2 pb-6">
              {all.map((cat) => (
                <Button
                  key={cat.id}
                  onClick={() => {
                    onSelect(cat.id);
                    setSheetOpen(false);
                  }}
                  className={[
                    "h-11 rounded-xl text-sm font-medium border transition-colors",
                    selected === cat.id
                      ? "bg-black text-white border-black"
                      : "bg-white text-gray-700 border-gray-200 hover:border-gray-400",
                  ].join(" ")}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
