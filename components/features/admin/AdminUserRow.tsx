"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deactivateUser, deleteUser, reactivateUser, resetPassword } from "@/actions/user";

export type AdminUserRowData = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isSelf: boolean;
};

export function AdminUserRow({ user }: { readonly user: AdminUserRowData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    });
  }

  return (
    <tr className="border-b align-top">
      <td className="py-2 pr-2">{user.name}</td>
      <td className="py-2 pr-2 text-xs">{user.email}</td>
      <td className="py-2 pr-2 text-xs">{user.role}</td>
      <td className="py-2 pr-2 text-xs">{user.active ? "Active" : "Deactivated"}</td>
      <td className="py-2 pr-2">
        <div className="flex flex-wrap gap-1">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-32 rounded border px-2 py-1 text-xs"
          />
          <button
            type="button"
            disabled={isPending || newPassword.length < 8}
            onClick={() =>
              run(() => resetPassword(user.id, { password: newPassword }), "Password reset")
            }
            className="rounded border px-2 py-1 text-xs"
          >
            Reset
          </button>
          {!user.isSelf && (
            <>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => (user.active ? deactivateUser(user.id) : reactivateUser(user.id)),
                    user.active ? "User deactivated" : "User reactivated"
                  )
                }
                className="rounded border px-2 py-1 text-xs"
              >
                {user.active ? "Deactivate" : "Reactivate"}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => deleteUser(user.id), "User deleted")}
                className="rounded border px-2 py-1 text-xs text-danger"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
