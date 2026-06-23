"use client";

import { PageHeader } from "@/components/page-header";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { createUser, deleteUser, getUsers, updateUser } from "@/queries/user";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  User,
  UserRole,
} from "@/types/user";
import { Loader2, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserFormValues {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  role?: UserRole;
}

// ── Add / Edit dialog ─────────────────────────────────────────────────────────

interface UserDialogProps {
  open: boolean;
  editingUser: User | null;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: UserFormValues, id?: string) => Promise<void>;
}

function UserDialog({
  open,
  editingUser,
  onOpenChange,
  onSubmit,
}: UserDialogProps) {
  const isEdit = !!editingUser;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      role: "Cashier",
    },
  });

  // FIX: was useState(() => { reset(...) }) — that's not how useState works.
  // useEffect syncs form values whenever the dialog opens or the target user changes.
  useEffect(() => {
    reset({
      name: editingUser?.name ?? "",
      email: editingUser?.email ?? "",
      password: "",
      phone: editingUser?.phone ?? "",
      role: editingUser?.role ?? "Cashier",
    });
  }, [editingUser, open, reset]);

  async function submit(values: UserFormValues) {
    // FIX: backend updateEmployeeInfo throws BadRequestException if role is present
    // in the update payload ("Admin role cannot be updated"). Strip it on edit.
    const payload = isEdit
      ? { name: values.name, phone: values.phone }
      : values;
    await onSubmit(payload as UserFormValues, editingUser?.id);
    onOpenChange(false);
    reset({ name: "", email: "", password: "", phone: "", role: "Cashier" });
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
            <DialogTitle>{isEdit ? "Edit User" : "Add User"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Update details for ${editingUser.name}.`
                : "Create a staff account and assign a role."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="user-name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="user-name"
                placeholder="e.g. Maryam Karimi"
                {...register("name", { required: "Name is required" })}
              />
              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Email — only on create */}
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="user-email">
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-email"
                  type="email"
                  placeholder="e.g. maryam@shop.com"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                {errors.email && (
                  <p className="text-xs text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
            )}

            {/* Password — only on create */}
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="user-password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="user-password"
                  type="password"
                  placeholder="Min 6 characters"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
            )}

            {/* Phone */}
            <div className="grid gap-2">
              <Label htmlFor="user-phone">Phone</Label>
              <Input
                id="user-phone"
                placeholder="e.g. 0788 333 444"
                {...register("phone")}
              />
            </div>

            {/* Role — only on create; backend forbids updating role via this endpoint */}
            {!isEdit && (
              <div className="grid gap-2">
                <Label htmlFor="user-role">Role</Label>
                <select
                  id="user-role"
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                  {...register("role")}
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            )}
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
              {isEdit ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Loading skeleton row ──────────────────────────────────────────────────────

function UserSkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="size-9 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
        </div>
      </TableCell>
      <TableCell>
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
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

// ── Avatar initials helper ────────────────────────────────────────────────────

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Fetch users ────────────────────────────────────────────────────────────

  async function fetchUsers() {
    setIsLoading(true);
    setError(null);
    try {
      // FIX: getUsers now returns { data: User[], meta: UsersMeta } — destructure correctly.
      const { data } = await getUsers({});
      setUsers(data);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  // FIX: was useState(() => { fetchUsers() }) — useState does not run side effects.
  // useEffect with [] runs once on mount, which is the correct pattern.
  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Create / Update ────────────────────────────────────────────────────────

  async function handleSubmit(values: UserFormValues, id?: string) {
    if (id) {
      const payload: UpdateUserPayload = {
        name: values.name,
        phone: values.phone,
        // role intentionally omitted — backend throws if role is sent on update
      };
      await updateUser(id, payload);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === id
            ? {
                ...u,
                name: values.name ?? u.name,
                phone: values.phone ?? u.phone,
              }
            : u,
        ),
      );
      toast.success("User updated", {
        description: `${values.name} has been updated.`,
      });
    } else {
      const payload: CreateUserPayload = {
        name: values.name,
        email: values.email!,
        password: values.password!,
        phone: values.phone,
        role: values.role,
      };
      await createUser(payload);
      toast.success("User created", {
        description: `Account for ${values.name} has been created.`,
      });
    }
    // Always re-fetch so the list reflects the real server state (with proper ids).
    await fetchUsers();
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(user: User) {
    setDeletingId(user.id);
    try {
      // Optimistic removal
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      await deleteUser(user.id);
      toast.success("User deleted", {
        description: `${user.name} has been removed.`,
      });
    } catch {
      // Roll back on failure
      setUsers((prev) => [user, ...prev]);
      toast.error("Could not delete user", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Dialog openers ─────────────────────────────────────────────────────────

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  // ── Role filter ────────────────────────────────────────────────────────────

  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const filtered =
    roleFilter === "ALL" ? users : users.filter((u) => u.role === roleFilter);

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage staff accounts, roles, and permissions."
      >
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Add User
        </Button>
      </PageHeader>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Role filter tabs */}
      <div className="mb-4 flex gap-2">
        {["ALL", "Admin", "Cashier"].map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              roleFilter === r
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent"
            }`}
          >
            {r === "ALL"
              ? `All (${users.length})`
              : `${r}s (${users.filter((u) => u.role === r).length})`}
          </button>
        ))}
      </div>

      {/* FIX: broken JSX — was </TableHeadHead>Actions</TableHead> */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Name</TableHead>
              <TableHead>User Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <UserSkeletonRow key={i} />
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center">
                  <UserX className="mx-auto mb-2 size-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    {roleFilter !== "ALL"
                      ? `No ${roleFilter.toLowerCase()}s found.`
                      : error
                        ? "Failed to load users."
                        : "No users yet."}
                  </p>
                  {!error && roleFilter === "ALL" && (
                    <Button
                      variant="link"
                      size="sm"
                      className="mt-2"
                      onClick={openCreate}
                    >
                      Add your first user
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const isDeleting = deletingId === u.id;
                return (
                  <TableRow
                    key={u.id}
                    className="transition-colors hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="size-9">
                          <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-semibold">
                            {initials(u.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.email}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {u.phone || (
                        <span className="italic text-muted-foreground/60">
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === "Admin" ? "default" : "secondary"}
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => openEdit(u)}
                          aria-label={`Edit ${u.name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          disabled={isDeleting}
                          onClick={() => handleDelete(u)}
                          aria-label={`Delete ${u.name}`}
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

      {/* Add / Edit dialog */}
      <UserDialog
        open={dialogOpen}
        editingUser={editingUser}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
