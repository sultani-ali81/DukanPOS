import { CalendarDays } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate } from "@/utils/profile.helpers";

interface Props {
  id?: string;
  value: string | undefined;
  onChange: (val: string) => void;
  className?: string;
}

function parseLocalDate(value?: string) {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DateInput({ id, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalDate(value);
  const [month, setMonth] = useState(selected ?? new Date());
  const currentYear = new Date().getFullYear();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setMonth(selected ?? new Date());
    }
    setOpen(nextOpen);
  };

  const displayValue = value ? formatDate(value) : "";

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn(
              "w-full h-12 border border-gray-100 rounded-xl px-4 text-sm text-left bg-white flex items-center justify-between hover:border-gray-300",
              className,
            )}
          >
            <span
              className={cn(
                displayValue ? "text-gray-700" : "text-gray-400",
              )}
            >
              {displayValue || "Select date"}
            </span>
            <CalendarDays size={15} className="text-gray-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto rounded-2xl p-0"
          align="start"
          sideOffset={4}
          onInteractOutside={(event) => {
            if (
              (event.target as HTMLElement | null)?.closest(
                '[data-slot="select-content"]',
              )
            ) {
              event.preventDefault();
            }
          }}
        >
          <Calendar
            mode="single"
            selected={selected}
            month={month}
            onMonthChange={setMonth}
            onSelect={(date) => {
              if (!date) return;
              onChange(formatLocalDate(date));
              setOpen(false);
            }}
            captionLayout="dropdown"
            startMonth={new Date(currentYear - 119, 0)}
            endMonth={new Date(currentYear, 11)}
            reverseYears
          />

          {value && (
            <Button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full rounded-t-none border-x-0 border-b-0 text-xs text-gray-400 hover:text-gray-600"
              variant="ghost"
            >
              Clear date
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
