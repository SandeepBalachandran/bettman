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
    <div className="card relative space-y-3 p-4">
      <LoadingOverlay show={isPending} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">{user.name}</p>
          <p className="truncate text-xs text-gray-500">{user.email}</p>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1">
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-semibold">{user.role}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              user.active ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
            }`}
          >
            {user.active ? "Active" : "Deactivated"}
          </span>
          {user.chatMuted && (
            <span className="rounded-full bg-highlight/15 px-2 py-0.5 text-[11px] font-semibold text-highlight">Muted</span>
          )}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <FieldWithSave
          placeholder="UPI ID (name@bank)"
          value={upiId}
          onChange={setUpiIdValue}
          disabled={isPending || upiId === (user.upiId ?? "")}
          onSave={() => run(() => setUpiId(user.id, { upiId }), "UPI ID saved")}
          label="Save UPI ID"
          icon={<Save size={16} />}
        />
        <FieldWithSave
          placeholder="Avatar image URL"
          value={avatarUrl}
          onChange={setAvatarUrlValue}
          disabled={isPending || avatarUrl === (user.avatarUrl ?? "")}
          onSave={() => run(() => setAvatarUrl(user.id, { avatarUrl }), "Avatar saved")}
          label="Save avatar URL"
          icon={<Save size={16} />}
        />
        <FieldWithSave
          type="password"
          placeholder="New password"
          value={newPassword}
          onChange={setNewPassword}
          disabled={isPending || newPassword.length < 8}
          onSave={() => run(() => resetPassword(user.id, { password: newPassword }), "Password reset")}
          label="Reset password"
          icon={<KeyRound size={16} />}
        />
      </div>

      {!user.isSelf && (
        <div className="grid grid-cols-3 gap-2 sm:flex sm:justify-end">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(
                () => (user.active ? deactivateUser(user.id) : reactivateUser(user.id)),
                user.active ? "User deactivated" : "User reactivated"
              )
            }
            className="btn btn-outline gap-1.5 px-3 text-xs"
          >
            {user.active ? <Ban size={14} /> : <CheckCircle2 size={14} />}
            {user.active ? "Deactivate" : "Reactivate"}
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
            className="btn btn-outline gap-1.5 px-3 text-xs"
          >
            {user.chatMuted ? <Mic size={14} /> : <MicOff size={14} />}
            {user.chatMuted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => deleteUser(user.id), "User deleted")}
            className="btn btn-danger gap-1.5 px-3 text-xs"
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function FieldWithSave({
  type = "text",
  placeholder,
  value,
  onChange,
  disabled,
  onSave,
  label,
  icon,
}: {
  readonly type?: "text" | "password";
  readonly placeholder: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly disabled: boolean;
  readonly onSave: () => void;
  readonly label: string;
  readonly icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-2">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-pill min-w-0 flex-1"
      />
      <button
        type="button"
        disabled={disabled}
        onClick={onSave}
        className="btn btn-outline h-10 w-10 shrink-0 p-0"
        title={label}
        aria-label={label}
      >
        {icon}
      </button>
    </div>
  );
}
