import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { TeamFlag } from "@/components/TeamFlag";
import { PlayerAvatar } from "@/components/PlayerAvatar";
import { LocalDateTime } from "@/components/LocalDateTime";
import { RemindMissingButton } from "@/components/features/admin/RemindMissingButton";
import { isMatchLocked } from "@/lib/match-lock";
import { activeMatchWhere } from "@/lib/competition";
import { groupByMatch } from "@/lib/match-groups";

export default async function AdminPredictionsPage() {
  await requireAdmin();

  const [matches, allUsers] = await Promise.all([
    prisma.match.findMany({
      where: activeMatchWhere(),
      include: {
        homeTeam: true,
        awayTeam: true,
        predictions: {
          include: {
            user: true,
            winnerTeam: true,
            scorers: { include: { player: true } },
          },
        },
      },
      orderBy: { kickoffTime: "asc" },
    }),
    prisma.user.findMany({ select: { id: true, name: true } }),
  ]);

  const groups = groupByMatch(matches, (match) => match);

  return (
    <main className="mx-auto max-w-4xl space-y-6 sm:space-y-8 p-3 sm:p-4 md:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold gradient-text">All Predictions</h1>
        <p className="text-xs sm:text-sm text-gray-500">
          {allUsers.length} player{allUsers.length === 1 ? "" : "s"} · every prediction across every match
        </p>
      </div>

      {groups.map((group) => {
        return (
          <section key={group.key} className="space-y-3">
            <h2 className="inline-block">
              <span className={`rounded-full px-3 py-1 text-sm font-bold ${group.badgeClass}`}>
                {group.label}
              </span>
            </h2>

            <div className="space-y-3">
              {group.items.map((match) => {
                const predictedUserIds = new Set(match.predictions.map((p) => p.userId));
                const missingUsers = allUsers.filter((u) => !predictedUserIds.has(u.id));
                const locked = isMatchLocked(match);

                return (
                  <div key={match.id} className="card p-3 sm:p-4 space-y-2 sm:space-y-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm font-semibold">
                        <TeamFlag flag={match.homeTeam.flag} name={match.homeTeam.name} size={16} />
                        <span className="line-clamp-1">{match.homeTeam.name}</span>
                        <span className="text-gray-400">vs</span>
                        <span className="line-clamp-1">{match.awayTeam.name}</span>
                        <TeamFlag flag={match.awayTeam.flag} name={match.awayTeam.name} size={16} />
                      </div>
                      <span className="text-xs font-normal text-gray-400 whitespace-nowrap">
                        <LocalDateTime date={match.kickoffTime.toISOString()} />
                      </span>
                    </div>

                    {match.predictions.length === 0 ? (
                      <p className="text-xs text-gray-500">No predictions submitted yet.</p>
                    ) : (
                      <ul className="space-y-1.5 text-xs">
                        {match.predictions.map((prediction) => {
                          const has3rdScorer = prediction.scorers.length >= 3;
                          const has4thScorer = prediction.scorers.length >= 4;
                          const hasBooster = prediction.usedPointsBooster;

                          return (
                          <li
                            key={prediction.id}
                            className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-1 sm:gap-2 rounded bg-gray-50 dark:bg-white/5 p-2 sm:p-2.5"
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-semibold text-secondary line-clamp-1">
                                {prediction.user.name}
                              </span>
                              <div className="flex gap-0.5 items-center">
                                {hasBooster && <span title="2x Booster used">⚡</span>}
                                {has3rdScorer && <span title="3rd Scorer reward used">🔵</span>}
                                {has4thScorer && <span title="4th Scorer reward used">🔴</span>}
                              </div>
                            </div>
                            <span className="text-gray-500 hidden sm:inline">→</span>
                            <span className="line-clamp-1">
                              Result:{" "}
                              <span className="font-medium text-accent">
                                {prediction.predictedDraw ? "Draw" : (prediction.winnerTeam?.name ?? "—")}
                              </span>
                            </span>
                            <span className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-gray-200 dark:border-gray-700 pt-1 sm:pt-0 sm:pl-2 text-gray-500">
                              Scorers:
                              {prediction.scorers.length > 0 ? (
                                <span className="inline-flex flex-wrap gap-1 ml-1">
                                  {prediction.scorers.map((s) => (
                                    <span key={s.id} className="inline-flex items-center gap-0.5">
                                      <PlayerAvatar
                                        name={s.player.name}
                                        photoUrl={s.player.photoUrl}
                                        size={14}
                                      />
                                      <span className="line-clamp-1">{s.player.name}</span>
                                    </span>
                                  ))}
                                </span>
                              ) : (
                                <span className="ml-1 text-gray-400">—</span>
                              )}
                            </span>
                          </li>
                          );
                        })}
                      </ul>
                    )}

                    {missingUsers.length > 0 && (
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-gray-400">
                          Not yet predicted: {missingUsers.map((u) => u.name).join(", ")}
                        </p>
                        {!locked && <RemindMissingButton matchId={match.id} />}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </main>
  );
}
