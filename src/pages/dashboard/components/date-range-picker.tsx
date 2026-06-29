// src/pages/dashboard/components/date-range-picker.tsx
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarDays, X } from "lucide-react";
import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
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
  onChange,
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
    const next: DateRange = {
      from: range?.from,
      to: range?.to,
    };
    setLocal(next);
    onChange(next);
  };

  const handleApply = () => {
    if (!local.from || !local.to) return;
    onApply(local);
    setOpen(false);
  };

  const handleClear = () => {
    const empty: DateRange = { from: undefined, to: undefined };
    setLocal(empty);
    onChange(empty);
  };

  const hasRange = value.from && value.to;
  const canApply = local.from && local.to;

  const label = hasRange
    ? `${formatDate(value.from)} – ${formatDate(value.to)}`
    : "Custom Range";

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          disabled={disabled}
          className={[
            "flex items-center gap-2 h-9 px-3 rounded-xl border text-sm font-medium transition-colors",
            hasRange
              ? "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50",
            disabled ? "opacity-50 cursor-not-allowed" : "",
          ].join(" ")}
        >
          <CalendarDays className="size-3.5 shrink-0" />
          <span className="max-w-[180px] truncate">{label}</span>
          {hasRange && (
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="ml-1 rounded-full hover:bg-indigo-200 p-0.5 transition-colors"
            >
              <X className="size-3" />
            </span>
          )}
        </button>
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

        {/* Two-month calendars side by side */}
        <div className="flex gap-0 p-2">
          <DayPicker
            mode="range"
            selected={{ from: local.from, to: local.to }}
            onSelect={handleSelect}
            numberOfMonths={2}
            startMonth={new Date(2020, 0)}
            endMonth={new Date()}
            showOutsideDays={false}
            classNames={{
              months: "flex gap-6",
              month: "relative",
              month_caption: "flex justify-center items-center h-9 mx-8",
              caption_label: "text-sm font-semibold text-gray-900",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between z-10",
              button_previous:
                "h-7 w-7 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer",
              button_next:
                "h-7 w-7 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer",
              month_grid: "w-full border-collapse mt-1",
              weekdays: "flex",
              weekday: "text-gray-400 w-8 font-normal text-xs text-center",
              weeks: "mt-1",
              week: "flex w-full mt-1",
              day: "h-8 w-8 text-center text-sm relative",
              day_button:
                "h-8 w-8 rounded-lg text-sm hover:bg-indigo-50 transition-colors font-normal w-full",
              selected:
                "bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg",
              today: "font-bold text-indigo-600",
              outside: "opacity-0 pointer-events-none",
              disabled: "text-gray-300 cursor-not-allowed hover:bg-transparent",
              range_middle: "bg-indigo-50 text-indigo-700 rounded-none",
              range_start: "bg-indigo-600 text-white rounded-lg",
              range_end: "bg-indigo-600 text-white rounded-lg",
              hidden: "invisible",
            }}
          />
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
          <button
            onClick={handleClear}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear
          </button>
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
