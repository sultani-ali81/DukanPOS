import { useAuditLogs } from "@/hooks/use-audit-log";
import { usePagination } from "@/hooks/use-pagination";
import type { AuditLog } from "@/types/audit";
import { AuditEntityType } from "@/types/audit";
import { ChevronDown, ChevronRight, MoreHorizontal } from "lucide-react";
import { Fragment, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Pagination } from "./ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

import { formatAuditRecord } from "@/lib/audit-format";
import {
  actionBadgeVariant,
  actionLabel,
  entityLabel,
} from "@/lib/audit-labels";
import { cn } from "@/lib/utils";
import { StockMovementDetails } from "./stock-movement-detail";

interface LogsTableProps {
  entityId?: string;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const AUDIT_VALUE_PREVIEW_LENGTH = 80;

function AuditValuePreview({
  label,
  value,
  onView,
}: {
  label: string;
  value: string;
  onView: () => void;
}) {
  const isLong = value.length > AUDIT_VALUE_PREVIEW_LENGTH;

  return (
    <div className="flex min-w-0 items-center gap-1.5">
      {isLong && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              className="size-7 shrink-0"
              aria-label={`View all ${label.toLowerCase()} values`}
              onClick={(event) => {
                event.stopPropagation();
                onView();
              }}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>View all</TooltipContent>
        </Tooltip>
      )}
      <span className="min-w-0 truncate">{value}</span>
    </div>
  );
}

export default function LogsTable({ entityId }: LogsTableProps) {
  const [type, setType] = useState<AuditEntityType | undefined>(undefined);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [detail, setDetail] = useState<{
    label: string;
    value: string;
  } | null>(null);
  const { page, goToPage, itemsPerPage } = usePagination();

  const { logs, meta, isLoading, error } = useAuditLogs({
    entityId,
    type,
    page,
    itemsPerPage,
  });

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (error) {
    return <p className="p-3 text-sm text-destructive">{error}</p>;
  }

  return (
    <TooltipProvider>
      <div className="min-w-0 max-w-full overflow-hidden">
      {!entityId && (
        <div className="flex min-w-0 items-center justify-between p-3">
          <Select
            value={type ?? "all"}
            onValueChange={(val) =>
              setType(val === "all" ? undefined : (val as AuditEntityType))
            }
          >
            <SelectTrigger className="w-full max-w-[180px]">
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All entities</SelectItem>
              {Object.values(AuditEntityType).map((val) => (
                <SelectItem key={val} value={val}>
                  {entityLabel[val]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Table className="w-full min-w-[760px] table-fixed border-collapse">
        <TableHeader className="border-b bg-gray-200">
          <TableRow className="border-b-0 hover:bg-transparent">
            <TableHead className="w-10 p-3" />
            <TableHead className="w-[18%] p-3 font-semibold">
              Employee
            </TableHead>
            <TableHead className="w-[12%] p-3 font-semibold">Action</TableHead>
            <TableHead className="w-[25%] p-3 font-semibold">Before</TableHead>
            <TableHead className="w-[25%] p-3 font-semibold">After</TableHead>
            <TableHead className="w-40 p-3 font-semibold">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr]:border-b [&_tr:last-child]:border-b-0">
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="p-3 text-center text-muted-foreground"
              >
                Loading logs...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && logs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="p-3 text-center text-muted-foreground"
              >
                No logs found.
              </TableCell>
            </TableRow>
          )}

          {logs.map((log: AuditLog) => {
            const hasMovement = !!(log.stockIn || log.stockOut);
            const isExpanded = expandedIds.has(log.id);
            const before = formatAuditRecord(log.before);
            const after = formatAuditRecord(log.after);

            return (
              <Fragment key={log.id}>
                <TableRow
                  onClick={() => hasMovement && toggleExpand(log.id)}
                  className={cn(
                    hasMovement && "cursor-pointer hover:bg-muted/50",
                  )}
                >
                  <TableCell className="p-3">
                    {hasMovement &&
                      (isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      ))}
                  </TableCell>
                  <TableCell className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback>
                          {getInitials(log.employee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{log.employee.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-3">
                    {log.actionType ? (
                      <Badge variant={actionBadgeVariant[log.actionType]}>
                        {actionLabel[log.actionType]}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell className="overflow-hidden p-3 text-sm text-muted-foreground">
                    <AuditValuePreview
                      label="Before"
                      value={before}
                      onView={() => setDetail({ label: "Before", value: before })}
                    />
                  </TableCell>
                  <TableCell className="overflow-hidden p-3 text-sm">
                    <AuditValuePreview
                      label="After"
                      value={after}
                      onView={() => setDetail({ label: "After", value: after })}
                    />
                  </TableCell>
                  <TableCell
                    className="overflow-hidden p-3 text-muted-foreground"
                    title={formatDate(log.createdAt)}
                  >
                    <span className="block truncate whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>

                {hasMovement && isExpanded && (
                  <TableRow>
                    <TableCell colSpan={6} className="bg-muted/30 p-0">
                      <StockMovementDetails
                        stockIn={log.stockIn}
                        stockOut={log.stockOut}
                      />
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            );
          })}
        </TableBody>
      </Table>

      {meta && (
        <div className="p-3">
          <Pagination
            currentPage={meta.currentPage}
            totalPages={meta.totalPages}
            onPageChange={goToPage}
          />
        </div>
      )}

        <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{detail?.label} values</DialogTitle>
              <DialogDescription>
                Complete audit-log value for this change.
              </DialogDescription>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-y-auto rounded-lg border bg-muted/30 p-4">
              <p className="break-words whitespace-pre-wrap text-sm leading-relaxed">
                {detail?.value}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
