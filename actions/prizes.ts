"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { getActiveCompetition } from "@/lib/competition";
import { getPrizeSettings, getPrizeStandings, prizeWinners } from "@/lib/prizes";

const amount = z.coerce.number().int().min(0).max(100_000);

const settingsSchema = z.object({
  enabled: z.boolean(),
  firstPrize: amount,
  secondPrize: amount,
  thirdPrize: amount,
  minPredictions: z.coerce.number().int().min(0).max(1000),
});

export type PrizeSettingsInput = z.input<typeof settingsSchema>;

export async function updatePrizeSettings(input: PrizeSettingsInput) {
  await requireAdmin();
  const data = settingsSchema.parse(input);
  const competition = getActiveCompetition().code;

  // updateMany rather than upsert: keeps any duplicate rows (see getPrizeSettings) in sync.
  const { count } = await prisma.prizeConfig.updateMany({ where: { competition }, data });
  if (count === 0) {
    await prisma.prizeConfig.create({ data: { competition, ...data } });
  }

  revalidatePath("/admin/prizes");
  revalidatePath("/leaderboard");
  revalidatePath("/rewards");
  revalidatePath("/");
}

/**
 * Marks the voucher for a prize place as sent (snapshotting who won it and how much),
 * or clears that mark.
 */
export async function setPrizeSent(rank: number, sent: boolean) {
  await requireAdmin();
  if (![1, 2, 3].includes(rank)) throw new Error("Invalid prize place.");
  const competition = getActiveCompetition().code;

  if (!sent) {
    await prisma.prizeAward.deleteMany({ where: { competition, rank } });
  } else {
    const settings = await getPrizeSettings();
    const winner = prizeWinners(await getPrizeStandings(settings.minPredictions), settings).find(
      (w) => w.rank === rank
    );
    if (!winner) throw new Error("Nobody holds that prize place yet.");

    const award = {
      userId: winner.standing.userId,
      userName: winner.standing.name,
      userEmail: winner.standing.email,
      amount: winner.amount,
      sentAt: new Date(),
    };
    const existing = await prisma.prizeAward.findFirst({ where: { competition, rank } });
    if (existing) {
      await prisma.prizeAward.update({ where: { id: existing.id }, data: award });
    } else {
      await prisma.prizeAward.create({ data: { competition, rank, ...award } });
    }
  }

  revalidatePath("/admin/prizes");
}
