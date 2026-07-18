import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getQuizConfig } from "@/lib/quiz";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const config = await getQuizConfig();

    return NextResponse.json({
      questionsPerQuiz: config.questionsPerQuiz,
      secondsPerQuestion: config.secondsPerQuestion,
      completionCoins: config.completionCoins,
      coinsPerCorrect: config.coinsPerCorrect,
    });
  } catch (error) {
    console.error("Error fetching quiz config:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz config" },
      { status: 500 }
    );
  }
}
