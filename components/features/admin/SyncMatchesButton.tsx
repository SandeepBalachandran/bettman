"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { syncMatchesFromLiveApiAction } from "@/actions/match";

export function SyncMatchesButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncMatchesFromLiveApiAction();
        toast.success(
          `Synced ${result.determinedCount} confirmed and ${result.placeholderCount} TBD match(es).`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Sync failed.");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleSync}
      className="btn btn-primary"
    >
      {isPending ? "Syncing…" : "Sync from live API"}
    </button>
  );
}
