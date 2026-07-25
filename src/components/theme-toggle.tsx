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
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="group relative overflow-hidden rounded-full border border-border bg-background shadow-sm"
    >
      <Sun
        className={cn(
          "absolute size-5 text-amber-500 transition-all duration-500 ease-out",
          isDark
            ? "-rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100",
        )}
      />
      <Moon
        className={cn(
          "absolute size-5 fill-primary/20 text-primary transition-all duration-500 ease-out",
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "rotate-90 scale-0 opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute size-8 rounded-full transition-all duration-500",
          isDark
            ? "scale-100 bg-primary/10"
            : "scale-0 bg-amber-400/10",
        )}
      />
    </Button>
  );
}
