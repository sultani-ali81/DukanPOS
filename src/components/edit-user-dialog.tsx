"use client";

import { Button } from "@/components/ui/button";
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
import { PhoneNumberInput } from "@/components/ui/phoneinput";
import { type User } from "@/lib/data";
import { useState } from "react";
import type { Value as PhoneValue } from "react-phone-number-input";
import { toast } from "sonner";

export function EditUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState<PhoneValue>("");
  const [role, setRole] = useState<User["role"]>("Cashier");
  const [active, setActive] = useState(true);

  // Sync local state whenever a new user is opened.
  const [lastUserId, setLastUserId] = useState<string | null>(null);
  if (user && user.id !== lastUserId) {
    setLastUserId(user.id);
    setName(user.name);
    setPhone(user.phone as PhoneValue);
    setRole(user.role);
    setActive(user.active);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    toast.success("User updated", {
      description: `${name}'s profile has been updated successfully.`,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSave}>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update staff account details and role.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-user-name">Full Name</Label>
              <Input
                id="edit-user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
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
              <Label htmlFor="edit-user-role">Role</Label>
              <select
                id="edit-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value as User["role"])}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="Cashier">Cashier</option>
                <option value="Manager">Manager</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-user-status">Status</Label>
              <select
                id="edit-user-status"
                value={active ? "active" : "disabled"}
                onChange={(e) => setActive(e.target.value === "active")}
                className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
