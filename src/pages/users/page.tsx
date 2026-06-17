import { PageHeader } from "@/components/page-header"
import { AddUserDialog } from "@/components/add-user-dialog"
import { UsersClient } from "@/components/users-client"

export default function UsersPage() {
  return (
    <div>
      <PageHeader title="Users" description="Manage staff accounts, roles, and permissions.">
        <AddUserDialog />
      </PageHeader>

      <UsersClient />
    </div>
  )
}
