import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";

interface PasswordToggleProps {
  shown: boolean;
  onToggle: () => void;
  className?: string;
}

export function PasswordToggle({
  shown,
  onToggle,
  className,
}: PasswordToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      className={cn(
        "absolute right-2 top-1/2 flex size-9 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-400 outline-none transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
    >
      <span className="relative block size-[18px]" aria-hidden="true">
        <Eye
          className={cn(
            "absolute inset-0 size-[18px] transition-opacity",
            shown ? "opacity-0" : "opacity-100",
          )}
        />
        <EyeOff
          className={cn(
            "absolute inset-0 size-[18px] transition-opacity",
            shown ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
    </button>
  );
}
