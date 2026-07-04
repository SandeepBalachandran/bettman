"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/authz";
import { sendPushToAll, sendPushToUser } from "@/lib/push";

const subscriptionSchema = z.object({
  endpoint: z.string().min(1),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
});

export async function subscribeToPush(input: z.infer<typeof subscriptionSchema>) {
  const user = await requireAuth();
  const data = subscriptionSchema.parse(input);

  await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    update: { userId: user.id, p256dh: data.keys.p256dh, auth: data.keys.auth },
    create: {
      userId: user.id,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    },
  });
}

export async function unsubscribeFromPush(endpoint: string) {
  await requireAuth();
  await prisma.pushSubscription.deleteMany({ where: { endpoint } });
}

const adminNotificationSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(200),
});

export async function sendAdminNotification(input: z.infer<typeof adminNotificationSchema>) {
  await requireAdmin();
  const data = adminNotificationSchema.parse(input);

  const recipientCount = await sendPushToAll({ title: data.title, body: data.body });
  return { recipientCount };
}

export async function remindMissingPredictions(matchId: string) {
  await requireAdmin();

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { homeTeam: true, awayTeam: true, predictions: { select: { userId: true } } },
  });

  if (!match) {
    throw new Error("Match not found.");
  }

  const predictedUserIds = new Set(match.predictions.map((p) => p.userId));
  const missingUsers = await prisma.user.findMany({
    where: { role: "USER", active: true, id: { notIn: [...predictedUserIds] } },
    select: { id: true },
  });

  const matchName = `${match.homeTeam.name} vs ${match.awayTeam.name}`;
  const counts = await Promise.all(
    missingUsers.map((u) =>
      sendPushToUser(u.id, {
        title: "Don't forget to predict!",
        body: `${matchName} — get your picks in before it locks.`,
        url: `/predict/${matchId}`,
      })
    )
  );

  return { remindedUsers: missingUsers.length, recipientDevices: counts.reduce((a, b) => a + b, 0) };
}
