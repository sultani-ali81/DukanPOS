import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import type { Suggestion } from "@/types/purchases";

interface InlineComboboxProps {
  displayValue: string;
  placeholder: string;
  icon: React.ReactNode;
  suggestions: Suggestion[];
  loading: boolean;
  onFocus: () => void;
  onInputChange: (v: string) => void;
  onSelect: (id: string, label: string, sub: string) => void;
  error?: string;
}

export function InlineCombobox({
  displayValue,
  placeholder,
  icon,
  suggestions,
  loading,
  onFocus,
  onInputChange,
  onSelect,
  error,
}: InlineComboboxProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </span>
        <Input
          value={displayValue}
          placeholder={placeholder}
          className={`h-11 pl-9 pr-3 rounded-xl border-gray-200 text-sm ${error ? "border-red-400" : ""}`}
          onFocus={() => {
            onFocus();
            setOpen(true);
          }}
          onChange={(e) => {
            onInputChange(e.target.value);
            setOpen(true);
          }}
        />
      </div>

      {open && (displayValue.length > 0 || loading) && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {loading ? (
            <p className="px-4 py-3 text-xs text-gray-400">Searching…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-xs text-gray-400">No results</p>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(s.id, s.label, s.sub ?? "");
                  setOpen(false);
                }}
              >
                <p className="text-sm text-gray-800">{s.label}</p>
                {s.sub && <p className="text-xs text-gray-400">{s.sub}</p>}
              </button>
            ))
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
