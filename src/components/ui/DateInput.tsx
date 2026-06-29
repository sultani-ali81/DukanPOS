import { CalendarDays, ChevronDown } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandGroup, CommandItem } from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDate } from "@/utils/profile.helpers";

interface Props {
  id?: string;
  value: string | undefined;
  onChange: (val: string) => void;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DateInput({ id, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [format] = useState("MM/DD/YYYY");
  const [monthOpen, setMonthOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const parsed = value ? new Date(value) : null;

  const [viewYear, setViewYear] = useState(
    parsed?.getFullYear() ?? new Date().getFullYear(),
  );
  const [viewMonth, setViewMonth] = useState(
    parsed?.getMonth() ?? new Date().getMonth(),
  );

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();

  const selectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    onChange(`${viewYear}-${mm}-${dd}`);
    setOpen(false);
    setMonthOpen(false);
    setYearOpen(false);
  };

  const displayValue = parsed ? formatDate(parsed, format) : "";
  const selectedDay = parsed?.getDate();
  const selectedMonth = parsed?.getMonth();
  const selectedYear = parsed?.getFullYear();

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="w-full h-12 border border-gray-100 rounded-xl px-4 text-sm text-left bg-white flex items-center justify-between hover:border-gray-300"
          >
            <span className={displayValue ? "text-gray-700" : "text-gray-400"}>
              {displayValue || "Select date"}
            </span>
            <CalendarDays size={15} className="text-gray-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="p-4 w-72 rounded-2xl"
          align="start"
          sideOffset={4}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            {/* Month Dropdown */}
            <Popover open={monthOpen} onOpenChange={setMonthOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-between text-xs h-8 rounded-xl"
                >
                  {MONTHS[viewMonth]}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-0 w-40 rounded-xl overflow-hidden"
                align="start"
                sideOffset={4}
              >
                <Command>
                  <CommandGroup
                    className="max-h-60 overflow-y-auto overscroll-contain"
                    onWheel={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                  >
                    {MONTHS.map((m, i) => (
                      <CommandItem
                        key={m}
                        onSelect={() => {
                          setViewMonth(i);
                          setMonthOpen(false);
                        }}
                      >
                        {m}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>

            {/* Year Dropdown */}
            <Popover open={yearOpen} onOpenChange={setYearOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="flex-1 justify-between text-xs h-8 rounded-xl bg-white"
                >
                  {viewYear}
                  <ChevronDown className="h-3 w-3 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="p-1 w-32 rounded-xl"
                align="start"
                sideOffset={4}
              >
                <div
                  className="max-h-60 overflow-y-auto overscroll-contain"
                  onWheel={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  {Array.from({ length: 120 }).map((_, i) => {
                    const year = new Date().getFullYear() - i;
                    return (
                      <Button
                        key={year}
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setViewYear(year);
                          setYearOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-md hover:bg-gray-100
                          ${year === viewYear ? "bg-gray-100 font-medium" : ""}`}
                      >
                        {year}
                      </Button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Days Header */}
          <div className="grid grid-cols-7 mb-1">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] text-gray-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={i} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const isSelected =
                day === selectedDay &&
                viewMonth === selectedMonth &&
                viewYear === selectedYear;
              return (
                <Button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  variant="outline"
                  className={`w-8 h-8 mx-auto text-xs rounded-lg flex items-center justify-center
                    ${isSelected ? "bg-gray-900 text-white" : "hover:bg-gray-100 text-gray-700"}`}
                >
                  {day}
                </Button>
              );
            })}
          </div>

          {/* Clear */}
          {value && (
            <Button
              type="button"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
              className="w-full mt-3 text-xs text-gray-400 hover:text-gray-600"
              variant="outline"
            >
              Clear date
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
