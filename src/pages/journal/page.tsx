import { NewJournalEntryDialog } from "@/components/new-journal-entry-dialog";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, journalEntries } from "@/lib/data";
import { BookOpenCheck } from "lucide-react";

export default function JournalPage() {
  const totalDebit = journalEntries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = journalEntries.reduce((s, e) => s + e.credit, 0);

  return (
    <div className="overflow-y-auto">
      <PageHeader
        title="Journal"
        description="Simple accounting entries for your shop."
      >
        <NewJournalEntryDialog />
      </PageHeader>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-left">Debit</TableHead>
                <TableHead className="text-left">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {journalEntries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground">
                    {e.date}
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <BookOpenCheck className="size-4 text-muted-foreground" />
                      {e.account}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {e.description}
                  </TableCell>
                  <TableCell className="text-left">
                    {e.debit > 0 ? formatCurrency(e.debit) : "—"}
                  </TableCell>
                  <TableCell className="text-left">
                    {e.credit > 0 ? formatCurrency(e.credit) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 font-bold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-left">
                  {formatCurrency(totalDebit)}
                </TableCell>
                <TableCell className="text-left">
                  {formatCurrency(totalCredit)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
