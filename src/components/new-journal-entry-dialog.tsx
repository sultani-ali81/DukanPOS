"use client";

import { Button } from "@/components/ui/button";
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
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const ACCOUNTS = [
  "Cash",
  "Bank",
  "Sales Revenue",
  "Inventory",
  "Accounts Payable",
  "Accounts Receivable",
  "Rent Expense",
  "Utilities Expense",
  "Owner Equity",
];

export function NewJournalEntryDialog() {
  const [open, setOpen] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("Journal entry added", {
      description: "Your accounting entry has been recorded.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <div className="flex flex-row items-center gap-2">
          <Button>
            <Plus className="size-4" />
            New Entry
          </Button>
        </div>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>New Journal Entry</DialogTitle>
            <DialogDescription>
              Record a manual accounting entry.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="entry-date">Date</Label>
              <Input
                id="entry-date"
                type="date"
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-account">Account</Label>
              <select
                id="entry-account"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                {ACCOUNTS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-desc">Description</Label>
              <Input
                id="entry-desc"
                placeholder="e.g. Daily sales deposit"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entry-debit">Debit</Label>
                <Input id="entry-debit" type="number" placeholder="0" min="0" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entry-credit">Credit</Label>
                <Input
                  id="entry-credit"
                  type="number"
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Entry</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
