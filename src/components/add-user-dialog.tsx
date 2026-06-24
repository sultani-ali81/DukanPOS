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
import { PhoneNumberInput } from "@/components/ui/phoneinput";
import { Plus } from "lucide-react";
import { useState } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import { toast } from "sonner";

export function AddUserDialog() {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState<PhoneValue>("");

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("User added", {
      description: "The staff account has been created.",
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>
        <Button>
          <Plus className="size-4" /> Add User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Add User</DialogTitle>
            <DialogDescription>
              Create a staff account and assign a role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="user-name">Full Name</Label>
              <Input id="user-name" placeholder="e.g. Maryam Rahimi" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-phone">Phone</Label>
              <PhoneNumberInput
                value={phone}
                placeholder="e.g. 0788 333 444"
                onChange={setPhone}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-role">Role</Label>
              <select
                id="user-role"
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Cashier">Cashier</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="user-pin">Login PIN</Label>
              <Input
                id="user-pin"
                type="password"
                placeholder="4-digit PIN"
                inputMode="numeric"
                maxLength={4}
              />
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
            <Button type="submit">Save User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
