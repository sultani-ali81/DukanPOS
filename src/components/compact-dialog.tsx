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
        "max-w-sm rounded-2xl p-0 overflow-hidden gap-0",
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
        "px-5 pt-5 pb-4 border-b border-gray-100",
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
      className={cn("px-5 py-4 space-y-4", className)}
      {...props}
    />
  );
}

function CompactDialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("px-5 pb-5 flex gap-2", className)} {...props} />
  );
}

export {
  CompactDialogBody,
  CompactDialogContent,
  CompactDialogFooter,
  CompactDialogHeader,
};
