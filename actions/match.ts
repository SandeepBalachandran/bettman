"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { syncMatchesFromLiveApi, type SyncMatchesResult } from "@/lib/sync-matches";
import { syncFinishedMatchResults, syncFinishedMatchResultsWithScorers } from "@/lib/sync-match-results";
import { sendPushToAll } from "@/lib/push";

const matchObjectSchema = z.object({
  round: z.enum(["ROUND_OF_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"]),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  kickoffTime: z.coerce.date(),
});

function validateMatchInvariants(data: {
  homeTeamId: string;
  awayTeamId: string;
  kickoffTime: Date;
}) {
  if (data.homeTeamId === data.awayTeamId) {
    throw new Error("Home and away teams must be different.");
  }
  if (data.kickoffTime.getTime() <= Date.now()) {
    throw new Error("Kickoff time must be in the future.");
  }
}

export async function createMatch(input: z.infer<typeof matchObjectSchema>) {
  await requireAdmin();
  const data = matchObjectSchema.parse(input);
  validateMatchInvariants(data);

  const match = await prisma.match.create({ data });
  revalidatePath("/fixtures");
  return match;
}

const updateMatchSchema = matchObjectSchema.partial();

export async function updateMatch(
  matchId: string,
  input: z.infer<typeof updateMatchSchema>
) {
  await requireAdmin();
  const data = updateMatchSchema.parse(input);

  if (data.homeTeamId && data.awayTeamId && data.kickoffTime) {
    validateMatchInvariants({
      homeTeamId: data.homeTeamId,
      awayTeamId: data.awayTeamId,
      kickoffTime: data.kickoffTime,
    });
  }

  const match = await prisma.match.update({
    where: { id: matchId },
    data,
  });
  revalidatePath("/fixtures");
  revalidatePath(`/match/${matchId}`);
  return match;
}

export async function deleteMatch(matchId: string) {
  await requireAdmin();
  await prisma.match.delete({ where: { id: matchId } });
  revalidatePath("/fixtures");
}

export async function setMatchLocked(matchId: string, locked: boolean) {
  await requireAdmin();
  await prisma.match.update({ where: { id: matchId }, data: { locked } });
  revalidatePath("/fixtures");
  revalidatePath("/admin/matches");
}

const finishMatchSchema = z.object({
  winnerTeamId: z.string().min(1),
  scorerPlayerIds: z.array(z.string().min(1)).default([]),
});

export async function finishMatch(
  matchId: string,
  input: z.infer<typeof finishMatchSchema>
) {
  await requireAdmin();
  const data = finishMatchSchema.parse(input);

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    throw new Error("Match not found.");
  }

  if (data.winnerTeamId !== match.homeTeamId && data.winnerTeamId !== match.awayTeamId) {
    throw new Error("Winner must be one of the two teams in this match.");
  }

  if (data.scorerPlayerIds.length > 0) {
    const validPlayers = await prisma.player.findMany({
      where: {
        id: { in: data.scorerPlayerIds },
        teamId: { in: [match.homeTeamId, match.awayTeamId] },
      },
      select: { id: true },
    });
    if (validPlayers.length !== data.scorerPlayerIds.length) {
      throw new Error("Scorers must belong to one of the two teams in this match.");
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.match.update({
      where: { id: matchId },
      data: {
        status: "FINISHED",
        winnerTeamId: data.winnerTeamId,
        locked: true,
      },
    });

    await tx.matchScorer.deleteMany({ where: { matchId } });

    if (data.scorerPlayerIds.length > 0) {
      await tx.matchScorer.createMany({
        data: data.scorerPlayerIds.map((playerId) => ({ matchId, playerId })),
      });
    }
  });

  revalidatePath("/fixtures");
  revalidatePath(`/match/${matchId}`);
  revalidatePath("/leaderboard");
  revalidatePath("/admin");

  const winnerName =
    data.winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name;
  await sendPushToAll({
    title: "Match finished!",
    body: `${match.homeTeam.name} vs ${match.awayTeam.name} — ${winnerName} won. Check your points and money.`,
    url: `/match/${matchId}`,
  }).catch((error) => console.error("Failed to send match-finished push:", error));
}

export async function syncMatchesFromLiveApiAction(
  competitionCode = "WC"
): Promise<SyncMatchesResult> {
  await requireAdmin();
  const result = await syncMatchesFromLiveApi(prisma, competitionCode);
  revalidatePath("/fixtures");
  revalidatePath("/admin/matches");
  return result;
}

export async function syncMatchResultsAction(competitionCode = "WC") {
  await requireAdmin();
  const result = await syncFinishedMatchResults(prisma, competitionCode);

  if (result.updated.length > 0) {
    revalidatePath("/fixtures");
    revalidatePath("/admin/matches");
    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    revalidatePath("/money");

    for (const match of result.updated) {
      revalidatePath(`/match/${match.matchId}`);
      await sendPushToAll({
        title: "Match finished!",
        body: `${match.homeTeamName} vs ${match.awayTeamName} — ${match.winnerName} won. Check your points and money. (Scorers pending admin entry.)`,
        url: `/match/${match.matchId}`,
      }).catch((error) => console.error("Failed to send match-finished push:", error));
    }
  }

  return result;
}

export async function syncMatchResultsWithScorersAction() {
  await requireAdmin();
  const result = await syncFinishedMatchResultsWithScorers(prisma);

  if (result.updated.length > 0) {
    revalidatePath("/fixtures");
    revalidatePath("/admin/matches");
    revalidatePath("/leaderboard");
    revalidatePath("/admin");
    revalidatePath("/money");

    for (const match of result.updated) {
      revalidatePath(`/match/${match.matchId}`);
      const scorerNote =
        match.scorerNames.length > 0
          ? ` Scorers: ${match.scorerNames.join(", ")}.`
          : "";
      await sendPushToAll({
        title: "Match finished!",
        body: `${match.homeTeamName} vs ${match.awayTeamName} — ${match.winnerName} won.${scorerNote} Check your points and money.`,
        url: `/match/${match.matchId}`,
      }).catch((error) => console.error("Failed to send match-finished push:", error));
    }
  }

  return result;
}

export async function calculateLeaderboard() {
  await requireAdmin();
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}
