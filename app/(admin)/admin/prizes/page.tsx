import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { getActiveCompetition } from "@/lib/competition";
import { getPrizeSettings, getPrizeStandings, isSeasonComplete, prizeWinners } from "@/lib/prizes";
import { showPointsScore } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/format-money";
import { PrizeSettingsForm } from "@/components/features/admin/PrizeSettingsForm";
import { PrizeSentToggle } from "@/components/features/admin/PrizeSentToggle";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function AdminPrizesPage() {
  await requireAdmin();
  const competition = getActiveCompetition();

  const settings = await getPrizeSettings();
  const [standings, seasonComplete, awards, showPoints] = await Promise.all([
    getPrizeStandings(settings.minPredictions),
    isSeasonComplete(),
    prisma.prizeAward.findMany({ where: { competition: competition.code } }),
    showPointsScore(),
  ]);
  const winners = prizeWinners(standings, settings);
  const awardByRank = new Map(awards.map((a) => [a.rank, a]));
  const score = (s: (typeof standings)[number]) => (showPoints ? `${s.total} pts` : formatMoney(s.money));

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="space-y-1">
        <h1 className="gradient-text">Prizes</h1>
        <p className="text-xs text-gray-500 sm:text-sm">
          Amazon vouchers for the top 3 of {competition.name}.{" "}
          {seasonComplete ? "The season is over — these are the final winners." : "Season in progress — standings are live."}
        </p>
      </div>

      <PrizeSettingsForm settings={settings} />

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-display text-2xl leading-none">{seasonComplete ? "Winners" : "Current top 3"}</h2>
        {winners.length === 0 ? (
          <p className="text-sm text-gray-500">No eligible players yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06]">
            {winners.map(({ rank, amount, standing }) => {
              const award = awardByRank.get(rank);
              const changedSinceSent = award && award.userId !== standing.userId;
              return (
                <li key={rank} className="space-y-2 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {MEDALS[rank - 1]} {standing.name}
                      </p>
                      <p className="truncate text-xs text-gray-500">{standing.email}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-display text-2xl leading-none text-accent">₹{amount}</p>
                      <p className="text-[11px] text-gray-500">{score(standing)}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-gray-500">
                      {standing.correctResults} correct results · {standing.correctScorerGoals} scorer goals ·{" "}
                      {standing.matchesPlayed} matches
                    </p>
                    {seasonComplete && <PrizeSentToggle rank={rank} sent={Boolean(award) && !changedSinceSent} />}
                  </div>
                  {award && (
                    <p className={`text-[11px] ${changedSinceSent ? "text-danger" : "text-success"}`}>
                      {changedSinceSent
                        ? `Marked sent to ${award.userName} (${award.userEmail}) — the standings changed since.`
                        : `Sent ₹${award.amount} on ${award.sentAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {!seasonComplete && (
          <p className="text-xs text-gray-500">&quot;Voucher sent&quot; appears here once every match has been played.</p>
        )}
      </section>

      <section className="card space-y-3 p-4 sm:p-5">
        <h2 className="font-display text-2xl leading-none">Full standings</h2>
        <p className="text-xs text-gray-500">
          Ties: most correct results, then most scorer goals, then earliest signup.
        </p>
        <ol className="divide-y divide-white/[0.06]">
          {standings.map((s, index) => (
            <li key={s.userId} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <p className={`truncate text-sm ${s.eligible ? "font-medium" : "text-gray-500"}`}>
                  {index + 1}. {s.name}
                </p>
                {s.ineligibleReason && <p className="text-[11px] text-danger">Not eligible: {s.ineligibleReason}</p>}
              </div>
              <div className="shrink-0 text-right text-xs">
                <p className="font-semibold">{score(s)}</p>
                <p className="text-[11px] text-gray-500">
                  {s.correctResults} res · {s.correctScorerGoals} goals
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
