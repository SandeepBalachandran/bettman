"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect } from "react";
import { toast } from "sonner";
import { submitPrediction } from "@/actions/prediction";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PlayerCombobox } from "@/components/features/predictions/PlayerCombobox";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import type { MostPickedPlayer } from "@/lib/most-picked-players";

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
  mostPickedPlayers = [],
}: {
  readonly matchId: string;
  readonly homeTeam: PredictionFormTeam;
  readonly awayTeam: PredictionFormTeam;
  readonly initialWinnerTeamId: string | null;
  readonly initialScorerPlayerIds: string[];
  readonly coinBalance?: number;
  readonly mostPickedPlayers?: MostPickedPlayer[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [winnerTeamId, setWinnerTeamId] = useState(() => {
    return initialWinnerTeamId || "";
  });
  const [scorers, setScorers] = useState<string[]>(() => {
    if (initialWinnerTeamId) {
      return [
        initialScorerPlayerIds[0] ?? "",
        initialScorerPlayerIds[1] ?? "",
        initialScorerPlayerIds[2] ?? "",
        initialScorerPlayerIds[3] ?? "",
      ];
    }
    return ["", "", "", ""];
  });
  const [costFor3rdScorer, setCostFor3rdScorer] = useState(50);
  const [costFor4thScorer, setCostFor4thScorer] = useState(150);

  const scorerCount = scorers.filter(Boolean).length;
  const maxScorerIndex = 3; // Allow up to 4 scorers

  // Fetch dynamic scorer costs from config
  useEffect(() => {
    const fetchCosts = async () => {
      try {
        const response = await fetch("/api/admin/reward-config");
        if (response.ok) {
          const config = await response.json();
          setCostFor3rdScorer(config.thirdScorerCost);
          setCostFor4thScorer(config.fourthScorerCost);
        }
      } catch (error) {
        console.error("Error fetching scorer costs:", error);
      }
    };
    fetchCosts();
  }, []);
  let predictedCost = 0;
  if (scorerCount === 3) {
    predictedCost = costFor3rdScorer;
  } else if (scorerCount === 4) {
    predictedCost = costFor4thScorer;
  }

  const hasEnoughCoins = coinBalance >= predictedCost;

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
      setError(`You can only pick up to ${maxScorerIndex + 1} scorers.`);
      return;
    }
    if (new Set(scorerPlayerIds).size !== scorerPlayerIds.length) {
      setError("Scorer picks must be distinct players.");
      return;
    }

    // Check coin balance for premium scorers
    if (scorerPlayerIds.length === 3 && coinBalance < costFor3rdScorer) {
      setError(`Using 3 scorers costs ${costFor3rdScorer} coins. You have ${coinBalance}.`);
      return;
    }
    if (scorerPlayerIds.length === 4 && coinBalance < costFor4thScorer) {
      setError(`Using 4 scorers costs ${costFor4thScorer} coins. You have ${coinBalance}.`);
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
      {mostPickedPlayers.length > 0 && (
        <div className="rounded-lg border border-success/20 bg-success/5 p-3">
          <p className="text-xs font-medium text-success mb-2">📊 Popular Picks from Completed Matches</p>
          <div className="space-y-1">
            {mostPickedPlayers.map((player) => {
              const team = player.teamId === homeTeam.id ? homeTeam : awayTeam;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm bg-white/50 dark:bg-white/10"
                >
                  <PlayerAvatar name={player.name} photoUrl={player.photoUrl} size={24} />
                  {team.flag && <TeamFlag flag={team.flag} name={team.name} size={14} />}
                  <span className="truncate flex-1 text-gray-700 dark:text-gray-300">
                    {player.name}
                    {player.position && (
                      <span className="ml-1 text-xs text-gray-400">({player.position})</span>
                    )}
                  </span>
                  <span className="text-success font-semibold whitespace-nowrap">{player.pickCount}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
            Goal scorers (pick at least 2, up to 4)
          </legend>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {predictedCost > 0 && (
              <span className={hasEnoughCoins ? "text-success" : "text-danger"}>
                💰 {predictedCost} coins
              </span>
            )}
          </div>
        </div>

        {[0, 1, 2, 3].map((index) => {
          const label =
            index === 0 || index === 1
              ? `Scorer ${index + 1}`
              : index === 2
                ? `Scorer ${index + 1} (${costFor3rdScorer} coins)`
                : `Scorer ${index + 1} (${costFor4thScorer} coins)`;

          return (
            <PlayerCombobox
              key={index}
              players={allPlayers}
              value={scorers[index]}
              onChange={(playerId) => handleScorerChange(index, playerId)}
              placeholder={label}
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
          scorers.filter(Boolean).length > maxScorerIndex + 1 ||
          !hasEnoughCoins
        }
        className="btn btn-primary w-full py-2.5"
      >
        {isPending ? (
          "Saving..."
        ) : predictedCost > 0 ? (
          `${initialWinnerTeamId ? "Update" : "Save"} prediction (${predictedCost} 💰)`
        ) : (
          initialWinnerTeamId ? "Update prediction" : "Save prediction"
        )}
      </button>
    </form>
  );
}
