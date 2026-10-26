"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setPrizeSent } from "@/actions/prizes";

/** "Voucher sent" checkbox for one prize place. */
export function PrizeSentToggle({ rank, sent }: { readonly rank: number; readonly sent: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className={`flex shrink-0 items-center gap-2 text-xs font-medium ${isPending ? "opacity-50" : ""}`}>
      <input
        type="checkbox"
        checked={sent}
        disabled={isPending}
        className="h-4 w-4 accent-[var(--accent)]"
        onChange={(e) => {
          const next = e.target.checked;
          startTransition(async () => {
            try {
              await setPrizeSent(rank, next);
              toast.success(next ? "Marked as sent" : "Unmarked");
              router.refresh();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Failed to update");
            }
          });
        }}
      />
      Voucher sent
    </label>
  );
}
