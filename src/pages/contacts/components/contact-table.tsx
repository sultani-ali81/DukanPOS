import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Customer } from "@/types/customer";
import { Loader2, Pencil, Trash2, UserX } from "lucide-react";

// ── Skeleton ──────────────────────────────────────────────────────────────────

export function CustomerSkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 w-4 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-36 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="flex gap-1">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────

interface ContactTableProps {
  customers: Customer[];
  isLoading: boolean;
  pageSize: number;
  search: string;
  selected: Set<string>;
  deletingId: string | null;
  onToggleAll: () => void;
  onToggleOne: (id: string) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onRowClick: (customer: Customer) => void;
  onAddFirst: () => void;
}

export function ContactTable({
  customers,
  isLoading,
  pageSize,
  search,
  selected,
  deletingId,
  onToggleAll,
  onToggleOne,
  onEdit,
  onDelete,
  onRowClick,
  onAddFirst,
}: ContactTableProps) {
  const allSelected =
    customers.length > 0 && selected.size === customers.length;
  const someSelected = selected.size > 0 && selected.size < customers.length;

  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">
              <Checkbox
                checked={someSelected ? "indeterminate" : allSelected}
                onCheckedChange={onToggleAll}
                aria-label="Select all contacts"
              />
            </TableHead>
            <TableHead className="text-left">Name</TableHead>
            <TableHead className="text-left">Phone</TableHead>
            <TableHead className="text-left">Address</TableHead>
            <TableHead className="text-left">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {isLoading ? (
            Array.from({ length: pageSize }).map((_, i) => (
              <CustomerSkeletonRow key={i} />
            ))
          ) : customers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-12 text-center">
                <UserX className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {search
                    ? `No customers match "${search}"`
                    : "No customers yet."}
                </p>
                {!search && (
                  <Button
                    variant="link"
                    size="sm"
                    className="mt-2"
                    onClick={onAddFirst}
                  >
                    Add your first customer
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ) : (
            customers.map((c) => {
              const isSelected = selected.has(c.id);
              const isDeleting = deletingId === c.id;

              return (
                <TableRow
                  key={c.id}
                  data-state={isSelected ? "selected" : undefined}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => onRowClick(c)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggleOne(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </TableCell>

                  <TableCell className="font-medium text-left text-foreground">
                    {c.name}
                  </TableCell>

                  <TableCell className="text-left text-muted-foreground">
                    {c.phone}
                  </TableCell>

                  <TableCell className="text-left text-muted-foreground">
                    {c.address || (
                      <span className="italic text-muted-foreground/60">—</span>
                    )}
                  </TableCell>

                  <TableCell
                    className="text-left"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8"
                        onClick={() => onEdit(c)}
                        aria-label={`Edit ${c.name}`}
                      >
                        <Pencil className="size-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive hover:text-destructive"
                        disabled={isDeleting}
                        onClick={() => onDelete(c)}
                        aria-label={`Delete ${c.name}`}
                      >
                        {isDeleting ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
