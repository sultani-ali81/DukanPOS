import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { useCustomers } from "@/hooks/use-customers";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import {
  createCustomer,
  deleteCustomer,
  updateCustomer,
} from "@/queries/customer";
import type { Customer, PaginatedCustomers } from "@/types/customer";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import type { ContactFormValues } from "./components/contact-dialog";
import { ContactDialog } from "./components/contact-dialog";
import { ContactTable } from "./components/contact-table";

export default function ContactsPage() {
  const { mutate: mutateCache } = useSWRConfig();
  const {
    customers,
    isLoading,
    search,
    handleSearch,
    clearSearch,
    mutate,
    error,
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
    setSelected((prev) => {
      const next = new Set(prev);
      const allOnPageSelected = customers.every((customer) =>
        prev.has(customer.id),
      );

      customers.forEach((customer) => {
        if (allOnPageSelected) {
          next.delete(customer.id);
        } else {
          next.add(customer.id);
        }
      });

      return next;
    });
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
      await mutateCache(createCrudFamilyMatcher("customers"));
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }

  async function onDelete(customer: Customer) {
    setDeletingId(customer.id);
    const fallbackPage: PaginatedCustomers = {
      data: customers,
      meta: {
        total,
        page,
        totalCount: total,
        itemsPerpage: PAGE_SIZE,
        totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      },
    };
    const withoutDeletedCustomer = (
      current: PaginatedCustomers | undefined,
    ): PaginatedCustomers => {
      const source = current ?? fallbackPage;
      return {
        ...source,
        data: source.data.filter((item) => item.id !== customer.id),
      };
    };

    try {
      await mutate(
        async (current) => {
          await deleteCustomer(customer.id);
          return withoutDeletedCustomer(current);
        },
        {
          optimisticData: withoutDeletedCustomer,
          rollbackOnError: true,
          revalidate: false,
        },
      );
      await mutateCache(createCrudFamilyMatcher("customers"));
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

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Search */}
      <SearchField
        value={search}
        onValueChange={handleSearch}
        onClear={clearSearch}
        placeholder="Search contacts..."
        aria-label="Search contacts"
        className="mb-4"
      />

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
