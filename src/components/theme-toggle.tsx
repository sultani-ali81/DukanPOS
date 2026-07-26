import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useRef } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDark = resolvedTheme === "dark";

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
      document.documentElement.classList.remove("theme-transition");
    },
    [],
  );

  const toggleTheme = () => {
    document.documentElement.classList.add("theme-transition");
    setTheme(isDark ? "light" : "dark");

    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      document.documentElement.classList.remove("theme-transition");
    }, 500);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className={cn(
        "group relative h-8 w-14 overflow-hidden rounded-full border p-0 shadow-inner transition-colors duration-900",
        isDark
          ? "border-primary/30 bg-slate-950 hover:bg-slate-950"
          : "border-amber-300 bg-amber-100 hover:bg-amber-100",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0.5  flex size-6 items-center justify-center rounded-full shadow-sm transition-[transform,background-color] duration-800 ease-in-out",
          isDark
            ? "translate-x-7 rotate-[360deg] bg-primary"
            : "translate-x-0 rotate-0 bg-amber-400",
        )}
      >
        <Sun
          className={cn(
            "absolute size-4 text-amber-950 transition-all duration-300",
            isDark
              ? "-rotate-90 scale-0 opacity-0"
              : "rotate-0 scale-100 opacity-100",
          )}
        />
        <Moon
          className={cn(
            "absolute size-4 fill-primary-foreground/15 text-primary-foreground transition-all duration-300",
            isDark
              ? "rotate-0 scale-100 opacity-100"
              : "rotate-90 scale-0 opacity-0",
          )}
        />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "absolute left-2 top-4 size-1 rounded-full bg-white transition-opacity duration-300",
          isDark ? "opacity-70" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-4 top-1.5 size-0.5 rounded-full bg-white transition-opacity duration-300",
          isDark ? "opacity-50" : "opacity-0",
        )}
      />
    </Button>
  );
}
