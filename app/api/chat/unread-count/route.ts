import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { chatLastReadAt: true },
    });

    const count = await prisma.chatMessage.count({
      where: {
        userId: { not: user.id },
        createdAt: { gt: dbUser?.chatLastReadAt ?? new Date(0) },
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error fetching chat unread count:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat unread count" },
      { status: 500 }
    );
  }
}
