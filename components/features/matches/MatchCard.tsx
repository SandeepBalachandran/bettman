import Link from "next/link";
import { CountdownBadge } from "@/components/CountdownBadge";

export type MatchCardData = {
  id: string;
  kickoffTime: Date;
  locked: boolean;
  homeTeam: { name: string; flag: string | null };
  awayTeam: { name: string; flag: string | null };
  hasPrediction: boolean;
};

export function MatchCard({ match }: { readonly match: MatchCardData }) {
  return (
    <Link
      href={`/predict/${match.id}`}
      className="block rounded-lg border p-3 transition hover:border-accent hover:shadow-sm sm:p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-1">
        <CountdownBadge kickoffTime={match.kickoffTime.toISOString()} />
        {match.locked && (
          <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
            Locked
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <TeamLabel name={match.homeTeam.name} flag={match.homeTeam.flag} />
        <span className="text-sm text-gray-400">vs</span>
        <TeamLabel name={match.awayTeam.name} flag={match.awayTeam.flag} align="right" />
      </div>

      <div className="mt-3 text-xs">
        {match.hasPrediction ? (
          <span className="font-medium text-accent">Prediction submitted</span>
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
      className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      {flag && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={flag} alt="" width={24} height={24} className="rounded-sm" />
      )}
      <span className="text-sm font-medium">{name}</span>
    </div>
  );
}
