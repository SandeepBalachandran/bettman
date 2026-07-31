"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, KeyRound, Ban, CheckCircle2, Trash2, Mic, MicOff } from "lucide-react";
import {
  deactivateUser,
  deleteUser,
  reactivateUser,
  resetPassword,
  setAvatarUrl,
  setUpiId,
} from "@/actions/user";
import { toggleUserChatMute } from "@/actions/chat";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export type AdminUserRowData = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  isSelf: boolean;
  upiId: string | null;
  avatarUrl: string | null;
  chatMuted: boolean;
};

export function AdminUserRow({ user }: { readonly user: AdminUserRowData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [upiId, setUpiIdValue] = useState(user.upiId ?? "");
  const [avatarUrl, setAvatarUrlValue] = useState(user.avatarUrl ?? "");

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
    <tr className="align-top">
      <LoadingOverlay show={isPending} />
      <td className="py-2 pr-2 font-medium" data-label="Name">
        {user.name}
      </td>
      <td className="py-2 pr-2 text-xs" data-label="Email">
        {user.email}
      </td>
      <td className="py-2 pr-2 text-xs" data-label="Role">
        {user.role}
      </td>
      <td className="py-2 pr-2 text-xs" data-label="Status">
        {user.active ? "Active" : "Deactivated"}
      </td>
      <td className="py-2 pr-2" data-label="Actions">
        <div className="flex flex-wrap items-center justify-end gap-1 sm:justify-start">
          <input
            type="text"
            placeholder="name@bank"
            value={upiId}
            onChange={(e) => setUpiIdValue(e.target.value)}
            className="input-pill w-32"
          />
          <button
            type="button"
            disabled={isPending || upiId === (user.upiId ?? "")}
            onClick={() => run(() => setUpiId(user.id, { upiId }), "UPI ID saved")}
            className="btn btn-outline px-3 py-2"
            title="Save UPI ID"
            aria-label="Save UPI ID"
          >
            <Save size={16} />
          </button>
          <input
            type="text"
            placeholder="Avatar image URL"
            value={avatarUrl}
            onChange={(e) => setAvatarUrlValue(e.target.value)}
            className="input-pill w-40"
          />
          <button
            type="button"
            disabled={isPending || avatarUrl === (user.avatarUrl ?? "")}
            onClick={() =>
              run(() => setAvatarUrl(user.id, { avatarUrl }), "Avatar saved")
            }
            className="btn btn-outline px-3 py-2"
            title="Save avatar URL"
            aria-label="Save avatar URL"
          >
            <Save size={16} />
          </button>
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input-pill w-28"
          />
          <button
            type="button"
            disabled={isPending || newPassword.length < 8}
            onClick={() =>
              run(() => resetPassword(user.id, { password: newPassword }), "Password reset")
            }
            className="btn btn-outline px-3 py-2"
            title="Reset password"
            aria-label="Reset password"
          >
            <KeyRound size={16} />
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
                className="btn btn-outline px-3 py-2"
                title={user.active ? "Deactivate user" : "Reactivate user"}
                aria-label={user.active ? "Deactivate user" : "Reactivate user"}
              >
                {user.active ? <Ban size={16} /> : <CheckCircle2 size={16} />}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() =>
                  run(
                    () => toggleUserChatMute(user.id, !user.chatMuted),
                    user.chatMuted ? "User unmuted" : "User muted"
                  )
                }
                className="btn btn-outline px-3 py-2"
                title={user.chatMuted ? "Unmute from chat" : "Mute from chat"}
                aria-label={user.chatMuted ? "Unmute from chat" : "Mute from chat"}
              >
                {user.chatMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => deleteUser(user.id), "User deleted")}
                className="btn btn-danger px-3 py-2"
                title="Delete user"
                aria-label="Delete user"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
