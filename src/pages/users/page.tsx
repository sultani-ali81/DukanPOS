// src/pages/users/page.tsx
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { createUser, deleteUser, getUsers, updateUser } from "@/queries/user";
import type { CreateUserPayload, UpdateUserPayload, User } from "@/types/user";
import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserDialog } from "./components/user-dialog";
import { UserTable } from "./components/user-table";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState("ALL");

  // ── Fetch ─────────────────────────────────────────────────────────────────

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const { data } = await getUsers({});
      setUsers(data);
    } catch (err) {
      setError((err as Error).message ?? "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // ── Create / Update ───────────────────────────────────────────────────────

  async function handleSubmit(
    payload: CreateUserPayload | UpdateUserPayload,
    id?: string,
  ) {
    if (id) {
      await updateUser(id, payload as UpdateUserPayload);
      toast.success("User updated");
    } else {
      await createUser(payload as CreateUserPayload);
      toast.success("User created");
    }
    await fetchUsers();
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(user: User) {
    setDeletingId(user.id);
    try {
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      await deleteUser(user.id);
      toast.success("User deleted", {
        description: `${user.name} has been removed.`,
      });
    } catch {
      setUsers((prev) => [user, ...prev]);
      toast.error("Could not delete user", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Dialog helpers ────────────────────────────────────────────────────────

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  // ── Filtered list ─────────────────────────────────────────────────────────

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

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Role filter */}
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

      <UserTable
        users={filtered}
        loading={loading}
        deletingId={deletingId}
        roleFilter={roleFilter}
        error={error}
        onEdit={openEdit}
        onDelete={handleDelete}
        onAddFirst={openCreate}
      />

      <UserDialog
        open={dialogOpen}
        editingUser={editingUser}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
