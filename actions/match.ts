"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { syncMatchesFromLiveApi, type SyncMatchesResult } from "@/lib/sync-matches";
import { syncFinishedMatchResults, syncFinishedMatchResultsWithScorers } from "@/lib/sync-match-results";
import { sendPushToAll } from "@/lib/push";
import { COMPETITIONS, DRAW_PICK, getActiveCompetition, type CompetitionCode } from "@/lib/competition";
import { importIslSchedule, syncIslResults } from "@/lib/sync-isl";
import { finishedMatchPushBody, notifyFinishedMatches } from "@/lib/refresh-results";

/** Toast-ready outcome of an admin sync, regardless of which provider ran. */
export type AdminSyncMessages = { successes: string[]; errors: string[] };

function revalidateResultPages(matchIds: string[]) {
  revalidatePath("/fixtures");
  revalidatePath("/admin/matches");
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
  revalidatePath("/money");
  for (const matchId of matchIds) {
    revalidatePath(`/match/${matchId}`);
  }
}

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
  /** A team id, or DRAW_PICK for a drawn league match. */
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

  const isDraw = data.winnerTeamId === DRAW_PICK;
  if (isDraw && !COMPETITIONS[match.competition as CompetitionCode]?.allowsDraws) {
    throw new Error("This match can't end in a draw.");
  }
  if (!isDraw && data.winnerTeamId !== match.homeTeamId && data.winnerTeamId !== match.awayTeamId) {
    throw new Error("Winner must be one of the two teams in this match.");
  }
  const winnerTeamId = isDraw ? null : data.winnerTeamId;

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
        winnerTeamId,
        isDraw,
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

  const outcome = isDraw
    ? "it's a draw"
    : `${winnerTeamId === match.homeTeamId ? match.homeTeam.name : match.awayTeam.name} won`;
  await sendPushToAll({
    title: "Match finished!",
    body: `${match.homeTeam.name} vs ${match.awayTeam.name} — ${outcome}. Check your points and money.`,
    url: `/match/${matchId}`,
  }).catch((error) => console.error("Failed to send match-finished push:", error));
}

export async function syncMatchesFromLiveApiAction(): Promise<AdminSyncMessages> {
  await requireAdmin();

  if (getActiveCompetition().goalApi) {
    const schedule = await importIslSchedule(prisma);
    const results = await syncIslResults(prisma);
    await notifyFinishedMatches(results.finished);
    revalidateResultPages(results.finished.map((m) => m.matchId));
    return {
      successes: [
        `Synced ${schedule.matches} ISL matches across ${schedule.teams} teams` +
          (results.finished.length > 0 ? `, ${results.finished.length} new result(s).` : "."),
      ],
      errors: [],
    };
  }

  const result: SyncMatchesResult = await syncMatchesFromLiveApi(
    prisma,
    process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC"
  );
  revalidatePath("/fixtures");
  revalidatePath("/admin/matches");
  return {
    successes: [`Synced ${result.determinedCount} confirmed and ${result.placeholderCount} TBD match(es).`],
    errors: [],
  };
}

export async function syncMatchResultsAction(
  competitionCode = process.env.FOOTBALL_DATA_COMPETITION_CODE ?? "WC"
) {
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

export async function syncMatchResultsWithScorersAction(): Promise<AdminSyncMessages> {
  await requireAdmin();

  if (getActiveCompetition().goalApi) {
    const result = await syncIslResults(prisma);
    await notifyFinishedMatches(result.finished);
    revalidateResultPages(result.finished.map((m) => m.matchId));
    return {
      successes:
        result.finished.length > 0
          ? result.finished.map(finishedMatchPushBody)
          : [`No new finished matches (${result.live} live right now).`],
      errors: [],
    };
  }

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

  const messages: AdminSyncMessages = { successes: [], errors: [] };
  if (result.updated.length === 0) {
    messages.successes.push("No new finished matches to sync.");
  }
  for (const match of result.updated) {
    const scorers = match.scorerNames.length > 0 ? ` — scorers: ${match.scorerNames.join(", ")}` : "";
    messages.successes.push(`${match.homeTeamName} vs ${match.awayTeamName}: ${match.winnerName} won${scorers}`);
    if (match.unmatchedScorerNames.length > 0) {
      messages.errors.push(
        `Couldn't match scorer(s) for ${match.homeTeamName} vs ${match.awayTeamName}: ${match.unmatchedScorerNames.join(", ")} — add manually.`
      );
    }
  }
  if (result.teamLookupFailed.length > 0) {
    messages.errors.push(`Couldn't resolve team(s) on api-football: ${result.teamLookupFailed.join(", ")}`);
  }
  return messages;
}

export async function calculateLeaderboard() {
  await requireAdmin();
  revalidatePath("/leaderboard");
  revalidatePath("/admin");
}
