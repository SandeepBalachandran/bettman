"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { submitPrediction } from "@/actions/prediction";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PlayerCombobox } from "@/components/features/predictions/PlayerCombobox";

export type PredictionFormPlayer = {
  id: string;
  name: string;
  photoUrl?: string | null;
  position?: string | null;
};
export type PredictionFormTeam = {
  id: string;
  name: string;
  players: PredictionFormPlayer[];
};

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  initialWinnerTeamId,
  initialScorerPlayerIds,
}: {
  readonly matchId: string;
  readonly homeTeam: PredictionFormTeam;
  readonly awayTeam: PredictionFormTeam;
  readonly initialWinnerTeamId: string | null;
  readonly initialScorerPlayerIds: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState(initialWinnerTeamId ?? "");
  const [scorers, setScorers] = useState<string[]>([
    initialScorerPlayerIds[0] ?? "",
    initialScorerPlayerIds[1] ?? "",
    initialScorerPlayerIds[2] ?? "",
  ]);

  // Sort alphabetically within each team, but keep the two teams as separate
  // blocks (home team's roster, then away team's) rather than interleaving them.
  const byName = (a: PredictionFormPlayer, b: PredictionFormPlayer) => a.name.localeCompare(b.name);
  const allPlayers = [...[...homeTeam.players].sort(byName), ...[...awayTeam.players].sort(byName)];

  function handleScorerChange(index: number, playerId: string) {
    setScorers((prev) => {
      const next = [...prev];
      next[index] = playerId;
      return next;
    });
  }

  function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setError(null);

    if (!winnerTeamId) {
      setError("Please pick a winner.");
      return;
    }

    const scorerPlayerIds = scorers.filter(Boolean);
    if (scorerPlayerIds.length < 2) {
      setError("Please pick at least 2 goal scorers.");
      return;
    }
    if (new Set(scorerPlayerIds).size !== scorerPlayerIds.length) {
      setError("Scorer picks must be distinct players.");
      return;
    }

    startTransition(async () => {
      try {
        await submitPrediction({ matchId, winnerTeamId, scorerPlayerIds });
        toast.success(
          initialWinnerTeamId ? "Prediction updated!" : "Prediction submitted!"
        );
        router.refresh();
      } catch (submitError) {
        const message =
          submitError instanceof Error ? submitError.message : "Failed to save prediction.";
        setError(message);
        toast.error(message);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6 p-4 sm:p-5">
      <LoadingOverlay show={isPending} label="Saving your prediction..." />
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Winner</legend>
        {[homeTeam, awayTeam].map((team) => (
          <label
            key={team.id}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition ${
              winnerTeamId === team.id
                ? "border-accent bg-accent/10"
                : "border-transparent bg-black/2 dark:bg-white/5"
            }`}
          >
            <input
              type="radio"
              name="winnerTeamId"
              value={team.id}
              checked={winnerTeamId === team.id}
              onChange={() => setWinnerTeamId(team.id)}
            />
            {team.name}
          </label>
        ))}
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Goal scorers (pick at least 2, up to 3)</legend>
        {[0, 1, 2].map((index) => (
          <PlayerCombobox
            key={index}
            players={allPlayers}
            value={scorers[index]}
            onChange={(playerId) => handleScorerChange(index, playerId)}
            placeholder={`Scorer ${index + 1}...`}
            excludeIds={scorers.filter((_, i) => i !== index)}
          />
        ))}
      </fieldset>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !winnerTeamId || scorers.filter(Boolean).length < 2}
        className="btn btn-primary w-full py-2.5"
      >
        {isPending ? "Saving..." : initialWinnerTeamId ? "Update prediction" : "Save prediction"}
      </button>
    </form>
  );
}
