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
import { useMediaQuery } from "@/hooks/use-media-query";

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
  const isMobile = useMediaQuery("(max-width: 639px)");

  const handleOpen = (o: boolean) => {
    if (o) setLocal(value);
    setOpen(o);
  };

  const handleDayClick = (day: Date) => {
    // An empty or completed range always starts a fresh two-click selection.
    if (!local.from || local.to) {
      setLocal({ from: day, to: undefined });
      return;
    }

    // Allow the second date to be before the first while keeping the stored
    // range chronologically ordered.
    if (day < local.from) {
      setLocal({ from: day, to: local.from });
      return;
    }

    setLocal({ from: local.from, to: day });
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
            "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-xl border px-3 text-sm font-medium outline-none transition-colors focus-visible:ring-0 sm:w-auto",
            hasRange
              ? "border-indigo-300 bg-indigo-50 text-indigo-700 hover:border-indigo-500 hover:bg-indigo-100 active:border-indigo-600"
              : "border-gray-200 bg-white text-gray-600 hover:border-gray-400 hover:bg-gray-50 active:border-gray-500",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate text-left sm:max-w-[180px]">{label}</span>
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
        className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-gray-100 p-0 shadow-xl sm:w-auto"
        align={isMobile ? "center" : "end"}
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
          onDayClick={handleDayClick}
          numberOfMonths={isMobile ? 1 : 2}
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
