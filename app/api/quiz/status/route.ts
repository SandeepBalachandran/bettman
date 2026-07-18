import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/quiz";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const today = todayDateString();

    // Check if user played today (applies to everyone)
    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    return NextResponse.json({
      hasPlayedToday: !!attempt,
    });
  } catch (error) {
    console.error("Error checking quiz status:", error);
    return NextResponse.json(
      { error: "Failed to check quiz status" },
      { status: 500 }
    );
  }
}
