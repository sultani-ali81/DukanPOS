import { useAuditLogs } from "@/hooks/use-audit-log";
import { usePagination } from "@/hooks/use-pagination";
import {
  actionBadgeVariant,
  actionLabel,
  entityLabel,
} from "@/lib/audit-labels";
import type { AuditLog } from "@/types/audit";
import { AuditEntityType } from "@/types/audit";
import { useState } from "react";
import { LogDiffDialog } from "./log-diff-dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
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
    dateStyle: "medium",
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
    return (
      <Card className="p-6 text-sm text-destructive">Failed to load logs.</Card>
    );
  }

  return (
    <div className="overflow-hidden">
      {!entityId && (
        <div className="flex items-center justify-between border-b">
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
        <TableHeader className="bg-gray-100 ">
          <TableRow>
            <TableHead className="text-lg ">Employee</TableHead>
            <TableHead className="text-lg ">Entity</TableHead>
            <TableHead className="text-lg ">Action</TableHead>
            <TableHead className="text-lg ">Changes</TableHead>
            <TableHead className="text-lg ">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center justify-center text-muted-foreground py-8"
              >
                Loading logs...
              </TableCell>
            </TableRow>
          )}

          {!isLoading && logs.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground py-8"
              >
                No logs found.
              </TableCell>
            </TableRow>
          )}

          {logs.map((log: AuditLog) => (
            <TableRow
              key={log.id}
              className="text-center justify-center items-center"
            >
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback>
                      {getInitials(log.employee.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{log.employee.name}</span>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-muted-foreground text-sm">
                  {entityLabel[log.entityType]}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={actionBadgeVariant[log.actionType]}>
                  {actionLabel[log.actionType]}
                </Badge>
              </TableCell>
              <TableCell>
                <LogDiffDialog log={log} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(log.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {meta && (
        <div className="p-4 border-t">
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
