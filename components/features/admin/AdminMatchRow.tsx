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
    <tr className="border-b align-top">
      <LoadingOverlay show={isPending} />
      <td className="py-2 pr-2 text-xs">{match.round}</td>
      <td className="py-2 pr-2">
        <span className="flex items-center gap-1.5">
          <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={16} />
          {match.homeTeam.name} vs {match.awayTeam.name}
          <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={16} />
        </span>
      </td>
      <td className="py-2 pr-2 text-xs">{new Date(match.kickoffTime).toLocaleString()}</td>
      <td className="py-2 pr-2 text-xs">{match.status}</td>
      <td className="py-2 pr-2">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              run(() => setMatchLocked(match.id, !match.locked), "Lock state updated")
            }
            className="rounded border px-2 py-1 text-xs"
          >
            {match.locked ? "Unlock" : "Lock"}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => deleteMatch(match.id), "Match deleted")}
            className="rounded border px-2 py-1 text-xs text-danger"
          >
            Delete
          </button>
        </div>
      </td>
      <td className="py-2 pr-2">
        {match.status === "FINISHED" ? (
          <span className="text-xs text-gray-500">Finished</span>
        ) : (
          <div className="flex flex-col gap-1">
            <select
              value={winnerTeamId}
              onChange={(e) => setWinnerTeamId(e.target.value)}
              className="rounded border px-2 py-1 text-xs"
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
                className="rounded border px-2 py-1 text-xs"
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
              className="rounded bg-accent px-2 py-1 text-xs text-accent-foreground disabled:opacity-50"
            >
              Finish match
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
