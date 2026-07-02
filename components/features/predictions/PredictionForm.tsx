"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { submitPrediction } from "@/actions/prediction";

export type PredictionFormPlayer = { id: string; name: string };
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

  const allPlayers = [...homeTeam.players, ...awayTeam.players];

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
    if (new Set(scorerPlayerIds).size !== scorerPlayerIds.length) {
      setError("Scorer picks must be distinct players.");
      return;
    }

    startTransition(async () => {
      try {
        await submitPrediction({ matchId, winnerTeamId, scorerPlayerIds });
        router.refresh();
      } catch (submitError) {
        setError(
          submitError instanceof Error ? submitError.message : "Failed to save prediction."
        );
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Winner</legend>
        {[homeTeam, awayTeam].map((team) => (
          <label key={team.id} className="flex items-center gap-2 text-sm">
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
        <legend className="text-sm font-medium">Goal scorers (up to 3)</legend>
        {[0, 1, 2].map((index) => (
          <select
            key={index}
            value={scorers[index]}
            onChange={(event) => handleScorerChange(index, event.target.value)}
            className="w-full rounded border px-3 py-2 text-sm"
          >
            <option value="">— None —</option>
            {allPlayers.map((player) => (
              <option key={player.id} value={player.id}>
                {player.name}
              </option>
            ))}
          </select>
        ))}
      </fieldset>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
      >
        {isPending ? "Saving..." : initialWinnerTeamId ? "Update prediction" : "Save prediction"}
      </button>
    </form>
  );
}
