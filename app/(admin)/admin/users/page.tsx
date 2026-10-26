import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { CreateUserForm } from "@/components/features/admin/CreateUserForm";
import { AdminUserRow } from "@/components/features/admin/AdminUserRow";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-5 sm:space-y-6">
      <h1 className="gradient-text">Manage Players</h1>

      <CreateUserForm />

      <div className="space-y-3">
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
              upiId: user.upiId,
              avatarUrl: user.avatarUrl,
              chatMuted: user.chatMuted,
            }}
          />
        ))}
      </div>
    </div>
  );
}
