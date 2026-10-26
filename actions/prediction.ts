"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authz";
import { isMatchLocked } from "@/lib/match-lock";
import { spendCoins, getUnlockCost } from "@/lib/coin-rewards";
import { COMPETITIONS, DRAW_PICK, getActiveCompetition, type CompetitionCode } from "@/lib/competition";

const predictionSchema = z.object({
  matchId: z.string().min(1),
  /** A team id, or DRAW_PICK. */
  winnerTeamId: z.string().min(1),
  scorerPlayerIds: z
    .array(z.string().min(1))
    .max(4, "Pick at most 4 goal scorers."),
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

  if (!match || match.competition !== getActiveCompetition().code) {
    throw new Error("Match not found.");
  }

  if (isMatchLocked(match)) {
    throw new Error(
      "Predictions are locked for this match (locking happens automatically 30 minutes before kickoff)."
    );
  }

  if (match.homeTeamId === match.awayTeamId) {
    throw new Error("This match's teams haven't been determined yet.");
  }

  const predictedDraw = data.winnerTeamId === DRAW_PICK;
  if (predictedDraw && !COMPETITIONS[match.competition as CompetitionCode]?.allowsDraws) {
    throw new Error("This match can't end in a draw — pick a winner.");
  }
  if (!predictedDraw && data.winnerTeamId !== match.homeTeamId && data.winnerTeamId !== match.awayTeamId) {
    throw new Error("Winner pick must be one of the two teams in this match.");
  }
  const winnerTeamId = predictedDraw ? null : data.winnerTeamId;

  // Scorers are optional on a draw pick; a win pick needs at least 2.
  if (!predictedDraw && data.scorerPlayerIds.length < 2) {
    throw new Error("Pick at least 2 goal scorers.");
  }

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

  // Calculate coin cost based on number of scorers
  let coinCost = 0;
  if (data.scorerPlayerIds.length === 3) {
    coinCost = await getUnlockCost(3);
  } else if (data.scorerPlayerIds.length === 4) {
    coinCost = await getUnlockCost(4);
  }

  // Check and spend coins if needed
  if (coinCost > 0) {
    const reason = data.scorerPlayerIds.length === 3 ? "3rd_scorer" : "4th_scorer";
    const spent = await spendCoins(user.id, coinCost, reason, data.matchId);
    if (!spent) {
      throw new Error(`Insufficient coins. Using ${data.scorerPlayerIds.length} scorers costs ${coinCost} coins.`);
    }
  }

  const prediction = await prisma.$transaction(async (tx) => {
    const upserted = await tx.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId: data.matchId } },
      update: { winnerTeamId, predictedDraw },
      create: {
        userId: user.id,
        matchId: data.matchId,
        winnerTeamId,
        predictedDraw,
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
