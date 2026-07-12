import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCustomers } from "@/hooks/use-customers";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/queries/customer";
import type { Customer } from "@/types/customer";
import { Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { ContactFormValues } from "./components/contact-dialog";
import { ContactDialog } from "./components/contact-dialog";
import { ContactTable } from "./components/contact-table";

export default function ContactsPage() {
  const {
    customers,
    isLoading,
    search,
    handleSearch,
    clearSearch,
    mutate,
    total,
    page,
    setPage,
    PAGE_SIZE,
  } = useCustomers();

  // ── Dialog state ────────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  function openCreate() {
    setEditingCustomer(null);
    setDialogOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditingCustomer(customer);
    setDialogOpen(true);
  }

  // ── Selection state ─────────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function toggleAll() {
    const allSelected = selected.size === customers.length;
    setSelected(allSelected ? new Set() : new Set(customers.map((c) => c.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── CRUD handlers ───────────────────────────────────────────────────────────
  async function onSubmit(values: ContactFormValues, id?: string) {
    try {
      if (id) {
        await updateCustomer(id, values);
        toast.success("Contact updated", {
          description: `${values.name} has been updated.`,
        });
      } else {
        await createCustomer(values);
        toast.success("Contact added", {
          description: `${values.name} has been added.`,
        });
      }
      await mutate();
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }

  async function onDelete(customer: Customer) {
    setDeletingId(customer.id);
    try {
      mutate(
        (prev) =>
          prev
            ? { ...prev, data: prev.data.filter((c) => c.id !== customer.id) }
            : prev,
        false,
      );
      await deleteCustomer(customer.id);
      await mutate();
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(customer.id);
        return next;
      });
      toast.success("Contact deleted", {
        description: `${customer.name} has been removed.`,
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
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add Contact
        </Button>
      </PageHeader>

      {/* Search */}
      <div className="mb-4 relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          <Search className="size-4" />
        </span>
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search contacts..."
          className="pl-9 pr-8"
        />
        {search && (
          <button
            onClick={clearSearch}
            className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        )}
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

      <ContactTable
        customers={customers}
        isLoading={isLoading}
        pageSize={PAGE_SIZE}
        search={search}
        selected={selected}
        deletingId={deletingId}
        onToggleAll={toggleAll}
        onToggleOne={toggleOne}
        onEdit={openEdit}
        onDelete={onDelete}
        onRowClick={openEdit}
        onAddFirst={openCreate}
      />

      {/* Pagination */}
      <PaginationFooter
        currentPage={page}
        totalPages={Math.ceil(total / PAGE_SIZE)}
        onPageChange={setPage}
        summary={
          <>
            Showing {(page - 1) * PAGE_SIZE + 1}–
            {Math.min(page * PAGE_SIZE, total)} of {total}
          </>
        }
      />

      <ContactDialog
        open={dialogOpen}
        editingCustomer={editingCustomer}
        onOpenChange={setDialogOpen}
        onSubmit={onSubmit}
      />
    </div>
  );
}
