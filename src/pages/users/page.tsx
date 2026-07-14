import { PageHeader } from "@/components/page-header";
import { PaginationFooter } from "@/components/pagination-footer";
import { SearchField } from "@/components/search-field";
import { Button } from "@/components/ui/button";
import { useUsers } from "@/hooks/use-users";
import { createCrudFamilyMatcher } from "@/lib/crud-cache";
import { cn } from "@/lib/utils";
import { createUser, deleteUser, updateUser } from "@/queries/user";
import type { CreateUserPayload, UpdateUserPayload, User } from "@/types/user";
import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useSWRConfig } from "swr";
import { DeleteUserDialog } from "./components/delete-user-dialog";
import { UserDialog } from "./components/user-dialog";
import { UserTable } from "./components/user-table";

export default function UsersPage() {
  const { mutate: mutateCache } = useSWRConfig();
  const {
    users,
    total,
    isLoading,
    page,
    setPage,
    search,
    handleSearch,
    clearSearch,
    role,
    setRole,
    error,
    optimisticDelete,
    PAGE_SIZE,
  } = useUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  async function handleSubmit(
    payload: CreateUserPayload | UpdateUserPayload,
    id?: string,
  ) {
    try {
      if (id) {
        await updateUser(id, payload as UpdateUserPayload);
        toast.success("User updated");
      } else {
        await createUser(payload as CreateUserPayload);
        toast.success("User created");
      }
      await mutateCache(createCrudFamilyMatcher("users", id));
    } catch {
      toast.error("Something went wrong", { description: "Please try again." });
      throw new Error("submit failed");
    }
  }

  async function confirmDelete() {
    if (!userToDelete) return;
    const target = userToDelete;
    setDeletingId(target.id);
    setUserToDelete(null);
    try {
      optimisticDelete(target.id);
      await deleteUser(target.id);
      await mutateCache(createCrudFamilyMatcher("users", target.id));
      toast.success("User deleted", {
        description: `${target.name} has been removed.`,
      });
    } catch {
      await mutateCache(createCrudFamilyMatcher("users", target.id));
      toast.error("Could not delete user", {
        description: "Please try again.",
      });
    } finally {
      setDeletingId(null);
    }
  }

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

      {/* Search */}
      <SearchField
        value={search}
        onValueChange={handleSearch}
        onClear={clearSearch}
        placeholder="Search users..."
        aria-label="Search users"
        className="mb-4"
      />

      {/* Role filter */}
      <div className="mb-4 flex gap-2">
        {["ALL", "Admin", "Cashier"].map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              role === r
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            {r === "ALL" ? `All (${total})` : r}
          </button>
        ))}
      </div>

      <UserTable
        users={users}
        loading={isLoading}
        deletingId={deletingId}
        roleFilter={role}
        error={error}
        onRowClick={openEdit}
        onEdit={openEdit}
        onDelete={(user) => setUserToDelete(user)}
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

      <UserDialog
        open={dialogOpen}
        editingUser={editingUser}
        onOpenChange={setDialogOpen}
        onSubmit={handleSubmit}
      />

      <DeleteUserDialog
        user={userToDelete}
        open={!!userToDelete}
        isDeleting={!!deletingId}
        onConfirm={confirmDelete}
        onCancel={() => setUserToDelete(null)}
      />
    </div>
  );
}
