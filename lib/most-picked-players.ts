import { prisma } from "@/lib/prisma";

export type MostPickedPlayer = {
  id: string;
  name: string;
  position?: string | null;
  photoUrl?: string | null;
  teamId: string;
  pickCount: number;
  lastPickedAt: Date;
};

/**
 * Get the most picked players from completed matches.
 * Filters to only players from the two teams in the given match.
 * @param matchId - The current/upcoming match ID
 * @param limit - How many top players to return
 */
export async function getMostPickedPlayers(
  matchId: string,
  limit: number = 10
): Promise<MostPickedPlayer[]> {
  // Get the two teams for this match
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { homeTeamId: true, awayTeamId: true },
  });

  if (!match) {
    return [];
  }

  const teamIds = [match.homeTeamId, match.awayTeamId];

  // Aggregate: count how many times each player was picked in finished matches
  // and get the most recent pick timestamp
  const results = await prisma.predictionScorer.groupBy({
    by: ["playerId"],
    where: {
      prediction: {
        match: {
          status: "FINISHED",
        },
      },
      player: {
        teamId: { in: teamIds },
      },
    },
    _count: {
      playerId: true,
    },
    _max: {
      createdAt: true,
    },
    orderBy: {
      _max: {
        createdAt: "desc",
      },
    },
    take: limit,
  });

  // Fetch full player details
  const playerIds = results.map((r) => r.playerId);
  const players = await prisma.player.findMany({
    where: { id: { in: playerIds } },
  });

  // Map results with player details
  const pickCountMap = new Map(results.map((r) => [r.playerId, r._count.playerId]));
  const lastPickedMap = new Map(results.map((r) => [r.playerId, r._max.createdAt]));

  const result: MostPickedPlayer[] = playerIds
    .map((id) => {
      const player = players.find((p) => p.id === id);
      if (!player) return null;
      return {
        id: player.id,
        name: player.name,
        position: player.position,
        photoUrl: player.photoUrl,
        teamId: player.teamId,
        pickCount: pickCountMap.get(id) || 0,
        lastPickedAt: lastPickedMap.get(id) || new Date(),
      } as MostPickedPlayer;
    })
    .filter((p): p is MostPickedPlayer => p !== null);

  return result;
}
