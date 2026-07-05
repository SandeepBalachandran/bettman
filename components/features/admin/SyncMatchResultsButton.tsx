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
        if (result.updated.length === 0) {
          toast.success("No new finished matches to sync.");
        } else {
          for (const match of result.updated) {
            const scorers =
              match.scorerNames.length > 0 ? ` — scorers: ${match.scorerNames.join(", ")}` : "";
            toast.success(
              `${match.homeTeamName} vs ${match.awayTeamName}: ${match.winnerName} won${scorers}`
            );
            if (match.unmatchedScorerNames.length > 0) {
              toast.error(
                `Couldn't match scorer(s) for ${match.homeTeamName} vs ${match.awayTeamName}: ${match.unmatchedScorerNames.join(", ")} — add manually.`
              );
            }
          }
        }
        if (result.teamLookupFailed.length > 0) {
          toast.error(`Couldn't resolve team(s) on api-football: ${result.teamLookupFailed.join(", ")}`);
        }
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
