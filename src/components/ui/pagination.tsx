// src/components/ui/pagination.tsx
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "./button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const range = (start: number, end: number) =>
    Array.from({ length: end - start + 1 }, (_, i) => start + i);

  const getPageNumbers = () => {
    const totalPageNumbers = siblingCount + 5;

    if (totalPages < totalPageNumbers) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const shouldShowLeftDots = leftSiblingIndex > 2;
    const shouldShowRightDots = rightSiblingIndex < totalPages - 1;

    if (!shouldShowLeftDots && shouldShowRightDots) {
      const leftRange = range(1, 3 + siblingCount * 2);
      return [...leftRange, "...", totalPages];
    }

    if (shouldShowLeftDots && !shouldShowRightDots) {
      const rightRange = range(totalPages - (2 + siblingCount * 2), totalPages);
      return [1, "...", ...rightRange];
    }

    if (shouldShowLeftDots && shouldShowRightDots) {
      const middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [1, "...", ...middleRange, "...", totalPages];
    }
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8 p-0 rounded-lg"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pageNumbers?.map((page, index) =>
        page === "..." ? (
          <span
            key={`ellipsis-${index}`}
            className="h-8 w-8 flex items-center justify-center text-gray-400"
          >
            <MoreHorizontal className="h-4 w-4" />
          </span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page as number)}
            className="h-8 w-8 p-0 rounded-lg"
          >
            {page}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-8 w-8 p-0 rounded-lg"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
