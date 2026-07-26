import {
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import * as React from "react";

function CompactDialogContent({
  className,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  return (
    <DialogContent
      className={cn(
        "max-h-[calc(100dvh-2rem)] max-w-sm overflow-hidden rounded-2xl p-0 gap-0 [&>form]:flex [&>form]:min-h-0 [&>form]:max-h-[calc(100dvh-2rem)] [&>form]:flex-col",
        className,
      )}
      {...props}
    />
  );
}

function CompactDialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof DialogHeader>) {
  return (
    <DialogHeader
      className={cn(
        "shrink-0 border-b border-border px-5 pt-5 pb-4",
        className,
      )}
      {...props}
    />
  );
}

function CompactDialogBody({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4",
        className,
      )}
      {...props}
    />
  );
}

function CompactDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 gap-2 px-5 pb-5 pt-1", className)}
      {...props}
    />
  );
}

export {
  CompactDialogBody,
  CompactDialogContent,
  CompactDialogFooter,
  CompactDialogHeader,
};
