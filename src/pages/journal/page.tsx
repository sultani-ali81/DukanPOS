import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJournals } from "@/hooks/use-journal";
import { formatCurrency } from "@/lib/data";
import {
  getStatusClassName,
  getStatusLabel,
  getStatusVariant,
} from "@/lib/status";
import type { JournalItem } from "@/types/journal";
import { BookOpenCheck } from "lucide-react";
import { JournalDetailDialog } from "./journal-detail-dialog";

function entryDebit(items: JournalItem[]) {
  return items.reduce((s, i) => s + (i.debit ?? 0), 0);
}

function entryCredit(items: JournalItem[]) {
  return items.reduce((s, i) => s + (i.credit ?? 0), 0);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TableSkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableRow key={i}>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
          <TableCell>
            <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          </TableCell>
        </TableRow>
      ))}
    </>
  );
}

export default function JournalPage() {
  const {
    journals,
    loading,
    error,
    page,
    totalPages,
    goToPage,
    openDetail,
    closeDetail,
    detailOpen,
    selectedEntry,
    detailLoading,
  } = useJournals();

  const totalDebit = journals.reduce(
    (s, e) => s + entryDebit(e.items ?? []),
    0,
  );
  const totalCredit = journals.reduce(
    (s, e) => s + entryCredit(e.items ?? []),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Journal"
        description="Simple accounting entries for your shop."
      ></PageHeader>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-left">Debit</TableHead>
                <TableHead className="text-left">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton />
              ) : journals.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-12 text-center text-sm text-muted-foreground"
                  >
                    <BookOpenCheck className="mx-auto mb-3 size-8 text-muted-foreground/40" />
                    No journal entries yet.
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {journals.map((entry) => {
                    const seqId = entry.sequence
                      ? `${entry.sequence.prefix}-${String(entry.sequence.lastIndex).padStart(4, "0")}`
                      : "—";
                    const dr = entryDebit(entry.items ?? []);
                    const cr = entryCredit(entry.items ?? []);

                    return (
                      <TableRow
                        key={entry.id}
                        className="cursor-pointer transition-colors hover:bg-muted/50"
                        onClick={() => openDetail(entry)}
                      >
                        <TableCell className="font-medium">
                          <span className="flex items-center gap-2">
                            <BookOpenCheck className="size-4 text-muted-foreground" />
                            <span className="font-mono text-sm">{seqId}</span>
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(entry.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={getStatusVariant(entry.status)}
                            className={getStatusClassName(entry.status)}
                          >
                            {getStatusLabel(entry.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-left tabular-nums">
                          <span className="font-medium text-destructive">
                            {formatCurrency(dr)}
                          </span>
                        </TableCell>
                        <TableCell className="text-left tabular-nums">
                          <span className="font-medium text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(cr)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="border-t-2 font-bold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-left text-destructive tabular-nums">
                      {formatCurrency(totalDebit)}
                    </TableCell>
                    <TableCell className="text-left text-emerald-600 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(totalCredit)}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}

      <JournalDetailDialog
        open={detailOpen}
        onClose={closeDetail}
        entry={selectedEntry}
        loading={detailLoading}
      />
    </div>
  );
}
