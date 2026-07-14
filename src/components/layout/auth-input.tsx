import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type AuthInputProps = ComponentProps<typeof Input> & {
  icon: LucideIcon;
  trailing?: ReactNode;
};

export function AuthInput({
  icon: Icon,
  trailing,
  className,
  ...props
}: AuthInputProps) {
  return (
    <div className="relative">
      <Icon className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <Input
        className={cn(
          "h-12 rounded-xl pl-12 pr-12 placeholder:text-slate-400",
          className,
        )}
        {...props}
      />
      {trailing}
    </div>
  );
}
