import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/components/features/admin/CreateUserForm";
import { AdminUserRow } from "@/components/features/admin/AdminUserRow";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <h1 className="text-2xl font-semibold text-accent">Manage Users</h1>

      <CreateUserForm />

      <div className="overflow-x-auto rounded border">
        <table className="w-full min-w-150 text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2 pr-2 pl-3">Name</th>
              <th className="py-2 pr-2">Email</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-3">Actions</th>
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
