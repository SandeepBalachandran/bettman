import { prisma } from "@/lib/prisma";
import { getLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard";
import { activeMatchWhere, getActiveCompetition } from "@/lib/competition";
import { showPointsScore } from "@/lib/feature-flags";

export type PrizeSettings = {
  enabled: boolean;
  /** ₹ voucher values for 1st, 2nd and 3rd. */
  amounts: [number, number, number];
  minPredictions: number;
};

/** Prize settings for the active competition (₹100 / ₹50 / ₹30 until an admin changes them). */
export async function getPrizeSettings(): Promise<PrizeSettings> {
  const competition = getActiveCompetition().code;
  // Oldest row wins: two first-ever page loads can each create one before
  // the unique index exists, and saves update every row for the competition.
  const config =
    (await prisma.prizeConfig.findFirst({ where: { competition }, orderBy: { id: "asc" } })) ??
    (await prisma.prizeConfig.create({ data: { competition } }));
  return {
    enabled: config.enabled,
    amounts: [config.firstPrize, config.secondPrize, config.thirdPrize],
    minPredictions: config.minPredictions,
  };
}

export type PrizeStanding = LeaderboardEntry & {
  email: string;
  joinedAt: Date;
  eligible: boolean;
  /** Why the player can't win a prize, when they can't. */
  ineligibleReason: string | null;
};

/**
 * Prize ranking: the leaderboard score (money, or points while points are shown),
 * then most correct results, then most goals from scorer picks, then who joined first.
 * Admins and deactivated players are never eligible.
 */
export async function getPrizeStandings(minPredictions: number): Promise<PrizeStanding[]> {
  const [entries, users, showPoints] = await Promise.all([
    getLeaderboard(),
    prisma.user.findMany({ select: { id: true, email: true, role: true, active: true, createdAt: true } }),
    showPointsScore(),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));

  const standings = entries.flatMap((entry): PrizeStanding[] => {
    const user = userById.get(entry.userId);
    if (!user) return [];
    let ineligibleReason: string | null = null;
    if (user.role === "ADMIN") ineligibleReason = "Admin";
    else if (!user.active) ineligibleReason = "Deactivated";
    else if (entry.matchesPlayed < minPredictions)
      ineligibleReason = `Predicted ${entry.matchesPlayed}/${minPredictions} matches`;
    return [{ ...entry, email: user.email, joinedAt: user.createdAt, eligible: !ineligibleReason, ineligibleReason }];
  });

  const score = (s: PrizeStanding) => (showPoints ? s.total : s.money);
  return standings.sort(
    (a, b) =>
      score(b) - score(a) ||
      b.correctResults - a.correctResults ||
      b.correctScorerGoals - a.correctScorerGoals ||
      a.joinedAt.getTime() - b.joinedAt.getTime()
  );
}

/** The players currently in the three prize places (eligible players only), with their prize. */
export function prizeWinners(standings: PrizeStanding[], settings: PrizeSettings) {
  return standings
    .filter((s) => s.eligible)
    .slice(0, 3)
    .map((standing, index) => ({ rank: index + 1, amount: settings.amounts[index], standing }));
}

/** userId → prize amount for whoever currently holds a prize place (empty when prizes are off). */
export async function getCurrentPrizeHolders(): Promise<Map<string, number>> {
  const settings = await getPrizeSettings();
  if (!settings.enabled) return new Map();
  const winners = prizeWinners(await getPrizeStandings(settings.minPredictions), settings);
  return new Map(winners.map((w) => [w.standing.userId, w.amount]));
}

/** True once every match of the active competition has been played. */
export async function isSeasonComplete(): Promise<boolean> {
  const [total, unfinished] = await Promise.all([
    prisma.match.count({ where: activeMatchWhere() }),
    prisma.match.count({ where: { ...activeMatchWhere(), status: { not: "FINISHED" } } }),
  ]);
  return total > 0 && unfinished === 0;
}
