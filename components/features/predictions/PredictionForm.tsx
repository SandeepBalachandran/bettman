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
  jerseyNumber?: number | null;
};
export type PredictionFormTeam = {
  id: string;
  name: string;
  flag?: string | null;
  players: PredictionFormPlayer[];
};

export function PredictionForm({
  matchId,
  homeTeam,
  awayTeam,
  initialWinnerTeamId,
  initialScorerPlayerIds,
  coinBalance = 0,
  canUse3rdScorer = false,
  canUse4thScorer = false,
}: {
  readonly matchId: string;
  readonly homeTeam: PredictionFormTeam;
  readonly awayTeam: PredictionFormTeam;
  readonly initialWinnerTeamId: string | null;
  readonly initialScorerPlayerIds: string[];
  readonly coinBalance?: number;
  readonly canUse3rdScorer?: boolean;
  readonly canUse4thScorer?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState(initialWinnerTeamId ?? "");
  const [scorers, setScorers] = useState<string[]>([
    initialScorerPlayerIds[0] ?? "",
    initialScorerPlayerIds[1] ?? "",
    initialScorerPlayerIds[2] ?? "",
    initialScorerPlayerIds[3] ?? "",
  ]);

  const maxScorerIndex = canUse4thScorer ? 3 : canUse3rdScorer ? 2 : 1;

  // Sort alphabetically within each team, but keep the two teams as separate
  // blocks (home team's roster, then away team's) rather than interleaving them.
  const byName = (a: PredictionFormPlayer, b: PredictionFormPlayer) => a.name.localeCompare(b.name);
  const allPlayers = [
    ...[...homeTeam.players].sort(byName).map((p) => ({ ...p, teamFlag: homeTeam.flag })),
    ...[...awayTeam.players].sort(byName).map((p) => ({ ...p, teamFlag: awayTeam.flag })),
  ];

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
    if (scorerPlayerIds.length > maxScorerIndex + 1) {
      setError(`You can only pick up to ${maxScorerIndex + 1} scorers. Visit rewards to unlock more.`);
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
        <div className="flex items-center justify-between">
          <legend className="text-sm font-medium">
            Goal scorers (pick at least 2{maxScorerIndex > 1 ? `, up to ${maxScorerIndex + 1}` : ""})
          </legend>
          {!canUse3rdScorer && (
            <a
              href="/rewards"
              className="text-xs font-semibold text-accent hover:underline"
            >
              Unlock more →
            </a>
          )}
        </div>

        {[0, 1, 2, 3].map((index) => {
          const isLocked = index > maxScorerIndex;

          if (isLocked) {
            return (
              <div
                key={index}
                className="flex items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30"
              >
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  🔒 Scorer {index + 1}
                </span>
                <a
                  href="/rewards"
                  className="ml-auto text-xs font-semibold text-accent hover:underline"
                >
                  Unlock with coins
                </a>
              </div>
            );
          }

          return (
            <PlayerCombobox
              key={index}
              players={allPlayers}
              value={scorers[index]}
              onChange={(playerId) => handleScorerChange(index, playerId)}
              placeholder={`Scorer ${index + 1}...`}
              excludeIds={scorers.filter((_, i) => i !== index)}
            />
          );
        })}
      </fieldset>

      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={
          isPending ||
          !winnerTeamId ||
          scorers.filter(Boolean).length < 2 ||
          scorers.filter(Boolean).length > maxScorerIndex + 1
        }
        className="btn btn-primary w-full py-2.5"
      >
        {isPending ? "Saving..." : initialWinnerTeamId ? "Update prediction" : "Save prediction"}
      </button>
    </form>
  );
}
