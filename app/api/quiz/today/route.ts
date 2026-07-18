import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getOrCreateTodaysQuiz, getQuizConfig } from "@/lib/quiz";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    console.log("[Quiz API] Fetching quiz...");
    const { questions, date } = await getOrCreateTodaysQuiz();
    console.log(`[Quiz API] Got ${questions.length} questions for date ${date}`);

    const config = await getQuizConfig();
    console.log("[Quiz API] Got config:", config);

    // Return questions without correctIndex
    const safeQuestions = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty,
    }));

    return NextResponse.json({
      questions: safeQuestions,
      secondsPerQuestion: config.secondsPerQuestion,
    });
  } catch (error) {
    console.error("Error fetching today's quiz:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
