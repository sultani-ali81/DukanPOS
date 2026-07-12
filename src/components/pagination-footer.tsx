import { Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary?: ReactNode;
  className?: string;
}

export function PaginationFooter({
  currentPage,
  totalPages,
  onPageChange,
  summary,
  className = "",
}: PaginationFooterProps) {
  if (totalPages <= 1) return null;

  return (
    <div
      className={cn(
        "mt-6 flex flex-col items-center justify-between gap-3 text-sm text-muted-foreground sm:flex-row",
        className,
      )}
    >
      <span className="text-center sm:text-left">{summary}</span>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </div>
  );
}
