"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteMatch, finishMatch, setMatchLocked } from "@/actions/match";
import { TeamFlag } from "@/components/TeamFlag";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { PlayerCombobox } from "@/components/features/predictions/PlayerCombobox";

export type AdminMatchRowData = {
  id: string;
  round: string;
  homeTeam: { id: string; name: string; flag: string | null };
  awayTeam: { id: string; name: string; flag: string | null };
  players: {
    id: string;
    name: string;
    teamId: string;
    photoUrl?: string | null;
    position?: string | null;
    jerseyNumber?: number | null;
  }[];
  kickoffTime: string;
  status: string;
  locked: boolean;
  winnerTeamId: string | null;
};

export function AdminMatchRow({ match }: { readonly match: AdminMatchRowData }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [winnerTeamId, setWinnerTeamId] = useState(match.winnerTeamId ?? "");
  const [scorers, setScorers] = useState<string[]>(["", "", ""]);

  const playersWithTeamFlag = match.players.map((p) => ({
    ...p,
    teamFlag: p.teamId === match.homeTeam.id ? match.homeTeam.flag : match.awayTeam.flag,
  }));

  function run(action: () => Promise<unknown>, successMessage: string) {
    startTransition(async () => {
      try {
        await action();
        toast.success(successMessage);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Action failed.");
      }
    });
  }

  return (
    <div className="card relative space-y-3 p-4">
      <LoadingOverlay show={isPending} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
            {match.round}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(match.kickoffTime).toLocaleString()}
          </span>
        </div>
        <span className="text-xs font-medium text-gray-500">{match.status}</span>
      </div>

      <div className="flex items-center gap-2 text-sm font-medium">
        <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={18} />
        {match.homeTeam.name} vs {match.awayTeam.name}
        <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={18} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => setMatchLocked(match.id, !match.locked), "Lock state updated")}
          className="btn btn-outline"
        >
          {match.locked ? "Unlock" : "Lock"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => run(() => deleteMatch(match.id), "Match deleted")}
          className="btn btn-danger"
        >
          Delete
        </button>
      </div>

      {match.status === "FINISHED" ? (
        <p className="text-xs text-gray-500">Finished</p>
      ) : (
        <div className="grid grid-cols-1 gap-2 border-t border-[color-mix(in_srgb,var(--foreground)_8%,transparent)] pt-3 sm:grid-cols-2">
          <select
            value={winnerTeamId}
            onChange={(e) => setWinnerTeamId(e.target.value)}
            className="input-pill sm:col-span-2"
          >
            <option value="">Winner...</option>
            <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
            <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
          </select>
          {[0, 1, 2].map((index) => (
            <PlayerCombobox
              key={index}
              players={playersWithTeamFlag}
              value={scorers[index]}
              onChange={(playerId) => {
                const next = [...scorers];
                next[index] = playerId;
                setScorers(next);
              }}
              placeholder={`Scorer ${index + 1}...`}
              excludeIds={scorers.filter((_, i) => i !== index)}
            />
          ))}
          <button
            type="button"
            disabled={isPending || !winnerTeamId}
            onClick={() =>
              run(
                () =>
                  finishMatch(match.id, {
                    winnerTeamId,
                    scorerPlayerIds: scorers.filter(Boolean),
                  }),
                "Match finished"
              )
            }
            className="btn btn-primary sm:col-span-2"
          >
            Finish match
          </button>
        </div>
      )}
    </div>
  );
}
