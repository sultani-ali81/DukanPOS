import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onApply: (range: DateRange) => void;
  disabled?: boolean;
}

function formatDate(d: Date | undefined) {
  if (!d) return "";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DateRangePicker({
  value,
  onApply,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<DateRange>(value);

  const handleOpen = (o: boolean) => {
    if (o) setLocal(value);
    setOpen(o);
  };

  const handleSelect = (range: { from?: Date; to?: Date } | undefined) => {
    const next: DateRange = { from: range?.from, to: range?.to };
    setLocal(next);
  };

  const handleApply = () => {
    if (!local.from || !local.to) return;
    onApply(local);
    setOpen(false);
  };

  const handleClear = () => {
    const empty: DateRange = { from: undefined, to: undefined };
    setLocal(empty);
    onApply(empty);
    setOpen(false);
  };

  const hasRange = value.from && value.to;
  const canApply = local.from && local.to;

  const label = hasRange
    ? `${formatDate(value.from)} – ${formatDate(value.to)}`
    : "Custom range";

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          className={cn(
            "flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
            hasRange
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="max-w-[180px] truncate">{label}</span>
          {hasRange && (
            <span
              role="Button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-1 rounded-full hover:bg-indigo-200 p-0.5 transition-colors"
            >
              <X className="size-3" />
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="p-0 w-auto rounded-2xl shadow-xl border border-gray-100"
        align="end"
        sideOffset={8}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900">
            Select date range
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {local.from && local.to
              ? `${formatDate(local.from)} → ${formatDate(local.to)}`
              : local.from
                ? `From ${formatDate(local.from)} — pick end date`
                : "Pick a start date"}
          </p>
        </div>

        {/* Calendar */}
        <Calendar
          mode="range"
          selected={{ from: local.from, to: local.to }}
          onSelect={handleSelect}
          numberOfMonths={2}
          pagedNavigation
          startMonth={new Date(2020, 0)}
          endMonth={new Date(new Date().getFullYear() + 1, 11)}
          showOutsideDays={false}
          disabled={{ after: new Date() }}
        />

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 flex items-center justify-between gap-3 border-t border-gray-100">
          <Button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 rounded-xl border-gray-200 text-xs"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 rounded-xl text-xs font-semibold"
              disabled={!canApply}
              onClick={handleApply}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
