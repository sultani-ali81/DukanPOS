"use client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCustomerDialog } from "@/hooks/use-customer-dialog";
import { useCustomers } from "@/hooks/use-customers";
import type { Customer } from "@/types/customer";
import { Loader2, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ContactFormValues {
  name: string;
  phone: string;
  address: string;
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

interface ContactDialogProps {
  open: boolean;
  editingCustomer: Customer | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ContactFormValues, id?: string) => Promise<void>;
}

function ContactDialog({
  open,
  editingCustomer,
  onOpenChange,
  onSubmit,
}: ContactDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    defaultValues: {
      name: editingCustomer?.name ?? "",
      phone: editingCustomer?.phone ?? "",
      address: editingCustomer?.address ?? "",
    },
  });

  // Sync form when editingCustomer changes (dialog opens for edit)
  useState(() => {
    reset({
      name: editingCustomer?.name ?? "",
      phone: editingCustomer?.phone ?? "",
      address: editingCustomer?.address ?? "",
    });
  });

  async function submit(values: ContactFormValues) {
    await onSubmit(values, editingCustomer?.id);
    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent>
        <form onSubmit={handleSubmit(submit)}>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? "Edit Contact" : "Add Contact"}
            </DialogTitle>
            <DialogDescription>
              {editingCustomer
                ? `Update details for ${editingCustomer.name}.`
                : "Add a new customer to your contacts."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-name"
                placeholder="e.g. Ahmad Wali"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">
                Phone <span className="text-destructive">*</span>
              </Label>
              <Input
                id="contact-phone"
                placeholder="e.g. 0700 123 456"
                {...register("phone", {
                  required: "Phone is required",
                  pattern: {
                    value: /^[\d\s+]+$/,
                    message: "Enter a valid phone number",
                  },
                })}
              />
              {errors.phone && (
                <p className="text-xs text-destructive">
                  {errors.phone.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-address">Address</Label>
              <Input
                id="contact-address"
                placeholder="e.g. Shahr-e Naw, Kabul"
                {...register("address")}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {editingCustomer ? "Save Changes" : "Add Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading skeleton row ──────────────────────────────────────────────────────

function CustomerSkeletonRow() {
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const {
    customers,
    isLoading,
    search,
    handleSearch,
    mutate,
    total,
    page,
    setPage,
    PAGE_SIZE,
  } = useCustomers();

  const {
    dialogOpen,
    setDialogOpen,
    editingCustomer,
    handleOpenCreate,
    handleOpenEdit,
    handleSubmit,
    handleDelete,
  } = useCustomerDialog(mutate);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const allSelected =
    customers.length > 0 && selected.size === customers.length;
  const someSelected = selected.size > 0 && selected.size < customers.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onSubmit(values: ContactFormValues, id?: string) {
    try {
      await handleSubmit(values, id);
    } catch {
      throw new Error("submit failed");
    }
  }

  async function onDelete(id: string, name: string) {
    setDeletingId(id);
    try {
      await handleDelete(id);
      selected.delete(id);
      setSelected(new Set(selected));
      toast.success("Contact deleted", {
        description: `${name} has been removed.`,
      });
    } catch {
      toast.error("Could not delete contact", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Contacts" description="Manage your customers.">
        <Button onClick={handleOpenCreate}>
          <Plus className="size-4" /> Add Contact
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="mb-4">
        <span className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-muted-foreground">
            🔍
          </span>
          <Input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="pl-9"
          />
        </span>
      </div>

      {/* Bulk selection bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm">
          <span className="font-medium text-foreground">
            {selected.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            Clear selection
          </Button>
        </div>
      )}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={someSelected ? "indeterminate" : allSelected}
                  onCheckedChange={toggleAll}
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
              Array.from({ length: PAGE_SIZE }).map((_, i) => (
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
                      onClick={handleOpenCreate}
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
                    className="transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleOne(c.id)}
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
                        <span className="italic text-muted-foreground/60">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => handleOpenEdit(c)}
                          aria-label={`Edit ${c.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                          onClick={() => onDelete(c.id, c.name)}
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

      {/* Pagination */}
      {total > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * PAGE_SIZE >= total}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      <ContactDialog
        open={dialogOpen}
        editingCustomer={editingCustomer}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
    </div>
  );
}
