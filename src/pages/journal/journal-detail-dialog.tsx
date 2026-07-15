import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJournals } from "@/hooks/use-journal";
import { useMediaQuery } from "@/hooks/use-media-query";
import { formatCurrency } from "@/lib/currency";
import {
  getStatusClassName,
  getStatusLabel,
  getStatusVariant,
} from "@/lib/status";
import type { JournalEntry, JournalItem } from "@/types/journal";
import {
  BookOpenCheck,
  Loader2,
  ShoppingBag,
  ShoppingCart,
  X,
} from "lucide-react";

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function entryDebit(items: JournalItem[]) {
  return items.reduce((s, i) => s + (i.debit ?? 0), 0);
}

function entryCredit(items: JournalItem[]) {
  return items.reduce((s, i) => s + (i.credit ?? 0), 0);
}

function getTransaction(entry: JournalEntry) {
  for (const item of entry.items) {
    if (item.sale) return { type: "sale" as const, tx: item.sale };
    if (item.purchase) return { type: "purchase" as const, tx: item.purchase };
  }
  return null;
}

function JournalDetailContent({
  entry,
  loading,
}: {
  entry: ReturnType<typeof useJournals>["selectedEntry"];
  loading: boolean;
}) {
  const dr = entryDebit(entry?.items ?? []);
  const cr = entryCredit(entry?.items ?? []);
  const transaction = entry ? getTransaction(entry) : null;
  const txItems = transaction?.tx.items ?? [];
  const grandTotal =
    entry?.totalCurrBill ??
    txItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  if (loading || !entry) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {txItems.length > 0 && (
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {transaction?.type === "sale" ? "Items Sold" : "Items Purchased"}
          </p>
          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="h-8 py-1.5 text-xs">Product</TableHead>
                  <TableHead className="h-8 py-1.5 text-right text-xs w-12">
                    Qty
                  </TableHead>
                  <TableHead className="h-8 py-1.5 text-right text-xs w-20">
                    Unit
                  </TableHead>
                  <TableHead className="h-8 py-1.5 text-right text-xs w-20">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {txItems.map((txItem) => (
                  <TableRow key={txItem.id} className="h-9">
                    <TableCell className="py-2 font-medium text-sm max-w-[120px] truncate">
                      {txItem.product?.name ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-sm">
                      {txItem.quantity}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-sm">
                      {formatCurrency(txItem.unitPrice)}
                    </TableCell>
                    <TableCell className="py-2 text-right tabular-nums text-sm font-semibold">
                      {formatCurrency(txItem.quantity * txItem.unitPrice)}
                    </TableCell>
                  </TableRow>
                ))}

                <TableRow className="border-t-2 bg-muted/30">
                  <TableCell colSpan={3} className="py-2 text-sm font-bold">
                    Total
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm font-bold tabular-nums">
                    {formatCurrency(grandTotal / 2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <section>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          Ledger
        </p>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="h-8 py-1.5 text-xs">Account</TableHead>
                <TableHead className="h-8 py-1.5 text-xs w-20">Type</TableHead>
                <TableHead className="h-8 py-1.5 text-right text-xs w-20">
                  Debit
                </TableHead>
                <TableHead className="h-8 py-1.5 text-right text-xs w-20">
                  Credit
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {entry.items.map((item) => (
                <TableRow key={item.id} className="h-9">
                  <TableCell className="py-2 font-medium text-sm max-w-[120px] truncate">
                    {item.account?.name ?? "—"}
                  </TableCell>
                  <TableCell className="py-2">
                    <Badge variant="outline" className="text-xs capitalize">
                      {item.account?.type ?? "—"}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-sm">
                    {(item.debit ?? 0) > 0 ? (
                      <span className="font-medium text-destructive">
                        {formatCurrency(item.debit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="py-2 text-right tabular-nums text-sm">
                    {(item.credit ?? 0) > 0 ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(item.credit)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}

              <TableRow className="border-t-2 bg-muted/30">
                <TableCell colSpan={2} className="py-2 text-sm font-bold">
                  Total
                </TableCell>
                <TableCell className="py-2 text-right text-sm font-bold text-destructive tabular-nums">
                  {formatCurrency(dr)}
                </TableCell>
                <TableCell className="py-2 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(cr)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

function JournalDetailHeader({
  entry,
}: {
  entry: ReturnType<typeof useJournals>["selectedEntry"];
}) {
  const seqId = entry?.sequence
    ? `${entry.sequence.prefix}-${String(entry.sequence.lastIndex).padStart(4, "0")}`
    : "—";

  const transaction = entry ? getTransaction(entry) : null;

  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <BookOpenCheck className="size-4 text-muted-foreground shrink-0" />
        <span className="font-mono font-semibold text-sm">{seqId}</span>
        {entry && (
          <Badge
            variant={getStatusVariant(entry.status)}
            className={getStatusClassName(entry.status)}
          >
            {getStatusLabel(entry.status)}
          </Badge>
        )}

        {transaction && (
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {transaction.type === "sale" ? (
              <ShoppingCart className="size-3.5" />
            ) : (
              <ShoppingBag className="size-3.5" />
            )}
            <span className="capitalize">{transaction.type}</span>
          </span>
        )}
      </div>

      {entry?.createdAt && (
        <p className="text-xs text-muted-foreground pl-5">
          <span className="font-medium text-foreground">Created</span>{" "}
          {formatDate(entry.createdAt)} · {formatTime(entry.createdAt)}
        </p>
      )}
    </div>
  );
}

function JournalDetailMobileDialog({
  open,
  onClose,
  entry,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  entry: ReturnType<typeof useJournals>["selectedEntry"];
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="top-4 right-4 bottom-4 left-4 flex h-auto w-auto max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-2xl bg-background p-0 sm:max-w-none"
      >
          <div className="px-4 pt-5 pb-4 border-b shrink-0 flex items-start justify-between">
            <DialogTitle className="m-0">
              <JournalDetailHeader entry={entry} />
            </DialogTitle>
            <DialogClose asChild>
              <button
                type="button"
                aria-label="Close journal details"
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-muted/80 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogClose>
          </div>
          <div className="overflow-y-auto flex-1 px-4 py-5">
            <JournalDetailContent entry={entry} loading={loading} />
          </div>
      </DialogContent>
    </Dialog>
  );
}

function JournalDetailDesktopDialog({
  open,
  onClose,
  entry,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  entry: ReturnType<typeof useJournals>["selectedEntry"];
  loading: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0">
        <div className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="m-0">
            <JournalDetailHeader entry={entry} />
          </DialogTitle>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5">
          <JournalDetailContent entry={entry} loading={loading} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function JournalDetailDialog({
  open,
  onClose,
  entry,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  entry: ReturnType<typeof useJournals>["selectedEntry"];
  loading: boolean;
}) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  if (isDesktop) {
    return (
      <JournalDetailDesktopDialog
        open={open}
        onClose={onClose}
        entry={entry}
        loading={loading}
      />
    );
  }
  return (
    <JournalDetailMobileDialog
      open={open}
      onClose={onClose}
      entry={entry}
      loading={loading}
    />
  );
}
