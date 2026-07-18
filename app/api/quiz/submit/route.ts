import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { submitQuizAttempt, todayDateString, getQuizConfig } from "@/lib/quiz";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { answers } = body;

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { error: "Invalid answers format" },
        { status: 400 }
      );
    }

    const date = todayDateString();

    // Save to database
    const result = await submitQuizAttempt(user.id, date, answers);

    return NextResponse.json({
      correctCount: result.correctCount,
      coinsAwarded: result.coinsAwarded,
      newBalance: result.newBalance,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
