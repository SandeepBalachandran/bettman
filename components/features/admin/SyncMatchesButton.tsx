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
        result.successes.forEach((message) => toast.success(message));
        result.errors.forEach((message) => toast.error(message));
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
      className="btn btn-primary h-10 text-sm"
    >
      {isPending ? "Syncing…" : "Sync schedule"}
    </button>
  );
}
