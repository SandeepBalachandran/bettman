"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/authz";

const sendMessageSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Message can't be empty.")
    .max(500, "Message is too long (max 500 characters)."),
});

const CHAT_COOLDOWN_MS = 2000;

export async function sendChatMessage(input: { text: string }) {
  const user = await requireAuth();
  const data = sendMessageSchema.parse(input);

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { chatMuted: true },
  });

  if (dbUser?.chatMuted) {
    throw new Error("You've been muted by an admin and can't post messages.");
  }

  const lastMessage = await prisma.chatMessage.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });

  if (lastMessage && Date.now() - lastMessage.createdAt.getTime() < CHAT_COOLDOWN_MS) {
    throw new Error("You're posting too fast — wait a moment.");
  }

  const message = await prisma.chatMessage.create({
    data: { userId: user.id, text: data.text },
    include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
  });

  return message;
}

export async function deleteChatMessage(messageId: string) {
  await requireAdmin();

  try {
    await prisma.chatMessage.delete({ where: { id: messageId } });
  } catch {
    throw new Error("Message not found — it may have already been deleted.");
  }
}

export async function toggleUserChatMute(userId: string, muted: boolean) {
  await requireAdmin();

  await prisma.user.update({
    where: { id: userId },
    data: { chatMuted: muted },
  });

  revalidatePath("/admin/users");
}
