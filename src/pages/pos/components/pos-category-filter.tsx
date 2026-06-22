import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";

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
}: PosCategoryFilterProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const all = [{ id: "all", name: "All" }, ...categories];
  const selectedName = all.find((c) => c.id === selected)?.name ?? "All";
  const navigate = useNavigate();

  return (
    <>
      {/* ── DESKTOP ── */}
      <div className="hidden lg:flex mb-3 items-center gap-4">
        <Button
          onClick={() => navigate("/purchases")}
          className="cursor-pointer"
        >
          <ArrowLeft size={4}></ArrowLeft>
          Exit POS
        </Button>
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
