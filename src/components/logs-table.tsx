import { useAuditLogs } from "@/hooks/use-audit-log";
import { usePagination } from "@/hooks/use-pagination";
import { formatAuditRecord } from "@/lib/audit-format";
import {
  actionBadgeVariant,
  actionLabel,
  entityLabel,
} from "@/lib/audit-labels";
import type { AuditLog } from "@/types/audit";
import { AuditEntityType } from "@/types/audit";
import { useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
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
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default function LogsTable({ entityId }: LogsTableProps) {
  const [type, setType] = useState<AuditEntityType | undefined>(undefined);
  const { page, goToPage, itemsPerPage } = usePagination();

  const { logs, meta, isLoading, error } = useAuditLogs({
    entityId,
    type,
    page,
    itemsPerPage,
  });

  if (error) {
    return <p className="p-3 text-sm text-destructive">Failed to load logs.</p>;
  }

  return (
    <div>
      {!entityId && (
        <div className="flex items-center justify-between p-3">
          <Select
            value={type ?? "all"}
            onValueChange={(val) =>
              setType(val === "all" ? undefined : (val as AuditEntityType))
            }
          >
            <SelectTrigger className="w-[180px]">
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

      <Table>
        <TableHeader>
          <TableRow className="bg-gray-100">
            <TableHead className="p-3 font-semibold">Employee</TableHead>
            <TableHead className="p-3 font-semibold">Action</TableHead>
            <TableHead className="p-3 font-semibold">Before</TableHead>
            <TableHead className="p-3 font-semibold">After</TableHead>
            <TableHead className="p-3 font-semibold">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="p-3 text-center text-muted-foreground"
              >
                Loading logs...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && logs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="p-3 text-center text-muted-foreground"
              >
                No logs found.
              </TableCell>
            </TableRow>
          )}

          {logs.map((log: AuditLog) => (
            <TableRow key={log.id}>
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
              <TableCell className="p-3 text-sm text-muted-foreground">
                {formatAuditRecord(log.before)}
              </TableCell>
              <TableCell className="p-3 text-sm">
                {formatAuditRecord(log.after)}
              </TableCell>
              <TableCell className="p-3 text-muted-foreground">
                {formatDate(log.createdAt)}
              </TableCell>
            </TableRow>
          ))}
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
    </div>
  );
}
