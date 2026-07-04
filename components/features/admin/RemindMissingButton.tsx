"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { remindMissingPredictions } from "@/actions/push";

export function RemindMissingButton({ matchId }: { readonly matchId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await remindMissingPredictions(matchId);
        toast.success(
          result.remindedUsers === 0
            ? "Everyone has already predicted this match."
            : `Reminded ${result.remindedUsers} player(s) (${result.recipientDevices} device(s)).`
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to send reminder.");
      }
    });
  }

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={handleClick}
      className="btn btn-outline text-xs"
    >
      {isPending ? "Sending..." : "🔔 Remind"}
    </button>
  );
}
