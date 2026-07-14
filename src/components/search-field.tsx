import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";

interface SearchFieldProps {
  value: string;
  onValueChange: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  "aria-label": string;
  className?: string;
  inputClassName?: string;
}

export function SearchField({
  value,
  onValueChange,
  onClear,
  placeholder,
  "aria-label": ariaLabel,
  className,
  inputClassName,
}: SearchFieldProps) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn("pl-9 pr-8", inputClassName)}
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={onClear}
          className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
