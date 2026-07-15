import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import type { CashierBreakdown } from "@/types/dashboard";
import { Users } from "lucide-react";

function SkeletonRow() {
  return (
    <TableRow>
      {Array.from({ length: 8 }).map((_, i) => (
        <TableCell key={i}>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </TableCell>
      ))}
    </TableRow>
  );
}

function SessionStatusBadge({ status }: { status: "open" | "closed" }) {
  return status === "open" ? (
    <Badge className="bg-green-50 text-green-700 border-green-200 hover:bg-green-50">
      Open
    </Badge>
  ) : (
    <Badge className="bg-gray-100 text-red-500 border-gray-200 hover:bg-gray-100">
      Closed
    </Badge>
  );
}

interface CashierBreakdownTableProps {
  data: CashierBreakdown[];
  loading: boolean;
}

export function CashierBreakdownTable({
  data,
  loading,
}: CashierBreakdownTableProps) {
  return (
    <Card className="mb-4">
      <CardHeader className="">
        <CardTitle className="flex items-center text-base">
          <Users className="size-4 text-muted-foreground" />
          Today's Cashier Sessions
        </CardTitle>
      </CardHeader>

      <CardContent className="">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-bold">Name</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">
                  Opening Amount
                </TableHead>
                <TableHead className="text-right font-bold">
                  Total Sales
                </TableHead>
                <TableHead className="text-right font-bold">
                  Closing Amount
                </TableHead>
                <TableHead className="text-right font-bold">Cash In</TableHead>
                <TableHead className="text-right font-bold">Cash Out</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No cashier sessions for this period.
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => (
                  <TableRow
                    key={row.sessionId}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="font-medium">
                      {row.employeeName}
                    </TableCell>

                    <TableCell>
                      <SessionStatusBadge status={row.status} />
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.openingAmount)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums font-medium">
                      {formatCurrency(row.totalSales)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums">
                      {row.closingAmount != null ? (
                        formatCurrency(row.closingAmount)
                      ) : (
                        <span className="italic text-muted-foreground/60">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.cashIn)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.cashOut)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
