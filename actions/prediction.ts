"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1),
  scorerPlayerIds: z.array(z.string().min(1)).max(3).default([]),
});

export type PredictionInput = z.infer<typeof predictionSchema>;

export async function submitPrediction(input: PredictionInput) {
  const user = await requireAuth();
  const data = predictionSchema.parse(input);

  const scorerIds = new Set(data.scorerPlayerIds);
  if (scorerIds.size !== data.scorerPlayerIds.length) {
    throw new Error("Scorer picks must be distinct players.");
  }

  const match = await prisma.match.findUnique({
    where: { id: data.matchId },
  });

  if (!match) {
    throw new Error("Match not found.");
  }

  if (match.locked || match.kickoffTime.getTime() <= Date.now()) {
    throw new Error("Predictions are locked for this match.");
  }

  if (match.homeTeamId === match.awayTeamId) {
    throw new Error("This match's teams haven't been determined yet.");
  }

  if (data.winnerTeamId !== match.homeTeamId && data.winnerTeamId !== match.awayTeamId) {
    throw new Error("Winner pick must be one of the two teams in this match.");
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
      throw new Error("Scorer picks must belong to one of the two teams in this match.");
    }
  }

  const prediction = await prisma.$transaction(async (tx) => {
    const upserted = await tx.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: data.matchId } },
      update: { winnerTeamId: data.winnerTeamId },
      create: {
        userId: user.id,
        matchId: data.matchId,
        winnerTeamId: data.winnerTeamId,
      },
    });

    await tx.predictionScorer.deleteMany({
      where: { predictionId: upserted.id },
    });

    if (data.scorerPlayerIds.length > 0) {
      await tx.predictionScorer.createMany({
        data: data.scorerPlayerIds.map((playerId) => ({
          predictionId: upserted.id,
          playerId,
        })),
      });
    }

    return upserted;
  });

  revalidatePath("/fixtures");
  revalidatePath(`/predict/${data.matchId}`);
  revalidatePath(`/match/${data.matchId}`);
  revalidatePath("/my-predictions");

  return prediction;
}
