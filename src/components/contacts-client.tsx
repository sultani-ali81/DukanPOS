"use client";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contacts, formatCurrency, type Contact } from "@/lib/data";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

function ContactTable({ items }: { items: Contact[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = items.length > 0 && selected.size === items.length;
  const someSelected = selected.size > 0 && selected.size < items.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((c) => c.id)));
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

  return (
    <div className="space-y-3">
      {selected.size > 0 ? (
        <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm">
          <span className="font-medium text-foreground">
            {selected.size} selected
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              toast.success("Contacts deleted", {
                description: `${selected.size} contact(s) removed.`,
              });
              setSelected(new Set());
            }}
          >
            <Trash2 className="size-4" /> Delete
          </Button>
        </div>
      ) : null}

      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all contacts"
                />
              </TableHead>
              <TableHead className="text-left">Name</TableHead>
              <TableHead className="text-left">Phone</TableHead>
              <TableHead className="text-left">Balance</TableHead>
              <TableHead className="text-left">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((c) => {
              const isSelected = selected.has(c.id);
              return (
                <TableRow
                  key={c.id}
                  data-state={isSelected ? "selected" : undefined}
                >
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(c.id)}
                      aria-label={`Select ${c.name}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium  text-left text-foreground">
                    {c.name}
                  </TableCell>
                  <TableCell className="text-left text-muted-foreground">
                    {c.phone}
                  </TableCell>
                  <TableCell className="text-left">
                    {c.balance > 0 ? (
                      <Badge variant="destructive">
                        {formatCurrency(c.balance)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">
                        {formatCurrency(0)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-left">
                    <Button variant="ghost" size="sm">
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function AddContactDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"customer" | "supplier">("customer");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Contact saved", {
      description: `New ${type} has been added.`,
    });
    setOpen(false);
    setType("customer");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus className="size-4" /> Add Contact
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Add a new customer or supplier.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="contact-type">Type</Label>
              <select
                id="contact-type"
                value={type}
                onChange={(e) =>
                  setType(e.target.value as "customer" | "supplier")
                }
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="customer">Customer</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" placeholder="e.g. Ahmad Wali" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-phone">Phone</Label>
              <Input id="contact-phone" placeholder="e.g. 0700 123 456" />
            </div>
            {/* Suppliers require an address. */}
            {type === "supplier" ? (
              <div className="grid gap-2">
                <Label htmlFor="contact-address">Address</Label>
                <Input
                  id="contact-address"
                  placeholder="e.g. Shahr-e Naw, Kabul"
                  required
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Contact</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ContactsClient() {
  const customers = contacts.filter((c) => c.type === "customer");
  const suppliers = contacts.filter((c) => c.type === "supplier");

  return (
    <div>
      <PageHeader
        title="Contacts"
        description="Manage your customers and suppliers."
      >
        <AddContactDialog />
      </PageHeader>

      <Tabs defaultValue="customers">
        <TabsList>
          <TabsTrigger value="customers">
            Customers ({customers.length})
          </TabsTrigger>
          <TabsTrigger value="suppliers">
            Suppliers ({suppliers.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="customers" className="mt-4">
          <ContactTable items={customers} />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <ContactTable items={suppliers} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
