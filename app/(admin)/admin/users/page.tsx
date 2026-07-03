import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/components/features/admin/CreateUserForm";
import { AdminUserRow } from "@/components/features/admin/AdminUserRow";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-bold gradient-text">Manage Players</h1>

      <CreateUserForm />

      <div className="table-card overflow-x-auto">
        <table className="responsive-table w-full min-w-150 text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2.5 pr-2 pl-3">Name</th>
              <th className="py-2.5 pr-2">Email</th>
              <th className="py-2.5 pr-2">Role</th>
              <th className="py-2.5 pr-2">Status</th>
              <th className="py-2.5 pr-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <AdminUserRow
                key={user.id}
                user={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  role: user.role,
                  active: user.active,
                  isSelf: user.id === admin.id,
                }}
              />
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
