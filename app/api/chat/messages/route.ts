import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    const [messages, dbUser] = await Promise.all([
      prisma.chatMessage.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      }),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { chatMuted: true },
      }),
    ]);

    return NextResponse.json({
      messages: messages.reverse(),
      chatMuted: dbUser?.chatMuted ?? false,
      isAdmin: user.role === "ADMIN",
    });
  } catch (error) {
    console.error("Error fetching chat messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat messages" },
      { status: 500 }
    );
  }
}
