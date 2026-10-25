"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { syncMatchResultsWithScorersAction } from "@/actions/match";

export function SyncMatchResultsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSync() {
    startTransition(async () => {
      try {
        const result = await syncMatchResultsWithScorersAction();
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
      className="btn btn-outline"
    >
      {isPending ? "Checking results…" : "🔄 Sync results + scorers"}
    </button>
  );
}
