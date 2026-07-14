import { ChevronDown, ChevronRight, FileBarChart2 } from "lucide-react";
import { Fragment, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { usePagination } from "@/hooks/use-pagination";
import { cn } from "@/lib/utils";
import { useReport } from "@/queries/reports";
import type { ReportColumn, ReportType } from "@/types/reports";

interface ReportPanelProps<T extends { id: string }> {
  type: ReportType;
  columns: ReportColumn<T>[];
  renderExpanded?: (row: T) => React.ReactNode;
  emptyLabel: string;
}

function ReportSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((__, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full max-w-[120px] animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function ReportPanel<T extends { id: string }>({
  type,
  columns,
  renderExpanded,
  emptyLabel,
}: ReportPanelProps<T>) {
  const { page, setPage, itemsPerPage } = usePagination({
    initialItemsPerPage: 10,
    pageParam: `${type}Page`,
  });
  const { rows, meta, isLoading, error } = useReport<T>({
    type,
    page,
    limit: itemsPerPage,
  });
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const hasExpanded = !!renderExpanded;
  const totalCols = columns.length + (hasExpanded ? 1 : 0);

  const toggleRow = (id: string) => {
    if (!hasExpanded) return;
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {hasExpanded && <TableHead className="w-8" />}
                {columns.map((col) => (
                  <TableHead key={col.header} className={col.className}>
                    {col.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <ReportSkeleton cols={totalCols} />
              ) : error ? (
                <TableRow>
                  <TableCell
                    colSpan={totalCols}
                    className="py-12 text-center text-sm text-destructive"
                  >
                    {error}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={totalCols}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <FileBarChart2 className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                    No {emptyLabel} found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const isExpanded = expandedRows.has(row.id);
                  return (
                    <Fragment key={row.id}>
                      <TableRow
                        className={cn(
                          hasExpanded &&
                            "cursor-pointer transition-colors hover:bg-muted/50",
                        )}
                        onClick={() => toggleRow(row.id)}
                      >
                        {hasExpanded && (
                          <TableCell>
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        )}
                        {columns.map((col) => (
                          <TableCell key={col.header} className={col.className}>
                            {col.cell(row)}
                          </TableCell>
                        ))}
                      </TableRow>

                      {hasExpanded && isExpanded && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={totalCols} className="p-0">
                            <div className="px-10 py-3">
                              {renderExpanded!(row)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {meta && (
        <PaginationFooter
          currentPage={meta.currentPage}
          totalPages={meta.totalPages}
          onPageChange={setPage}
        />
      )}
    </>
  );
}
import { PaginationFooter } from "@/components/pagination-footer";
