"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { deleteMatch, finishMatch, setMatchLocked } from "@/actions/match";
import { TeamFlag } from "@/components/TeamFlag";
import { LoadingOverlay } from "@/components/LoadingOverlay";

export type AdminMatchRowData = {
  id: string;
  round: string;
  homeTeam: { id: string; name: string; flag: string | null };
  awayTeam: { id: string; name: string; flag: string | null };
  players: { id: string; name: string; teamId: string }[];
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
    <tr className="align-top">
      <LoadingOverlay show={isPending} />
      <td className="py-2 pr-2 text-xs" data-label="Round">
        {match.round}
      </td>
      <td className="py-2 pr-2" data-label="Match">
        <span className="flex items-center gap-1.5">
          <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={16} />
          {match.homeTeam.name} vs {match.awayTeam.name}
          <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={16} />
        </span>
      </td>
      <td className="py-2 pr-2 text-xs" data-label="Kickoff">
        {new Date(match.kickoffTime).toLocaleString()}
      </td>
      <td className="py-2 pr-2 text-xs" data-label="Status">
        {match.status}
      </td>
      <td className="py-2 pr-2" data-label="Actions">
        <div className="flex flex-col items-end gap-1 sm:items-stretch">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() => setMatchLocked(match.id, !match.locked), "Lock state updated")
            }
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
      </td>
      <td className="py-2 pr-2" data-label="Finish">
        {match.status === "FINISHED" ? (
          <span className="text-xs text-gray-500">Finished</span>
        ) : (
          <div className="flex flex-col items-end gap-1 sm:items-stretch">
            <select
              value={winnerTeamId}
              onChange={(e) => setWinnerTeamId(e.target.value)}
              className="input-pill"
            >
              <option value="">Winner...</option>
              <option value={match.homeTeam.id}>{match.homeTeam.name}</option>
              <option value={match.awayTeam.id}>{match.awayTeam.name}</option>
            </select>
            {[0, 1, 2].map((index) => (
              <select
                key={index}
                value={scorers[index]}
                onChange={(e) => {
                  const next = [...scorers];
                  next[index] = e.target.value;
                  setScorers(next);
                }}
                className="input-pill"
              >
                <option value="">Scorer {index + 1}...</option>
                {match.players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
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
              className="btn btn-primary"
            >
              Finish match
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
