import Link from "next/link";
import { CountdownBadge } from "@/components/CountdownBadge";
import { TeamBadge } from "@/components/TeamBadge";

export type MatchCardData = {
  id: string;
  kickoffTime: Date;
  locked: boolean;
  status: string;
  homeTeam: { name: string; flag: string | null };
  awayTeam: { name: string; flag: string | null };
  hasPrediction: boolean;
  liveStatus?: string;
  /** Live or final score, when known. */
  score?: { home: number; away: number };
  isNext?: boolean;
};

const LIVE_STATUS_LABELS: Record<string, string> = {
  IN_PLAY: "Live",
  PAUSED: "Half-time",
  FINISHED: "Full-time",
};

export function MatchCard({ match }: { readonly match: MatchCardData }) {
  const liveLabel = match.liveStatus ? LIVE_STATUS_LABELS[match.liveStatus] : undefined;
  const href = match.status === "FINISHED" ? `/match/${match.id}` : `/predict/${match.id}`;

  return (
    <Link
      id={`match-${match.id}`}
      href={href}
      className={`card card-interactive block p-4 ${match.isNext ? "animate-pulse-border" : ""}`}
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
        <CountdownBadge kickoffTime={match.kickoffTime.toISOString()} />
        <div className="flex items-center gap-1">
          {match.isNext && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
              Up next
            </span>
          )}
          {liveLabel && (
            <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-semibold text-accent">
              {liveLabel}
            </span>
          )}
          {match.locked && (
            <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
              Locked
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamLabel name={match.homeTeam.name} flag={match.homeTeam.flag} />
        <span
          className={`font-display whitespace-nowrap tabular-nums leading-none ${
            match.score ? "text-4xl" : "text-2xl text-white/40"
          } ${match.liveStatus && match.liveStatus !== "FINISHED" ? "text-accent" : ""}`}
        >
          {match.score ? `${match.score.home}:${match.score.away}` : "VS"}
        </span>
        <TeamLabel name={match.awayTeam.name} flag={match.awayTeam.flag} align="right" />
      </div>

      <div className="mt-3 text-xs">
        {match.hasPrediction ? (
          <span className="font-semibold text-accent">✓ Prediction submitted</span>
        ) : (
          <span className="text-gray-500">No prediction yet</span>
        )}
      </div>
    </Link>
  );
}

function TeamLabel({
  name,
  flag,
  align = "left",
}: {
  readonly name: string;
  readonly flag: string | null;
  readonly align?: "left" | "right";
}) {
  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <TeamBadge flag={flag} name={name} size={44} />
      <span className="truncate text-sm font-semibold">{name}</span>
    </div>
  );
}
