import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { submitQuizAttempt, todayDateString, getOrCreateTodaysQuiz } from "@/lib/quiz";
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

    // Fetch the questions to get correct answers for detailed breakdown
    const { questions } = await getOrCreateTodaysQuiz();

    // Save to database
    const result = await submitQuizAttempt(user.id, date, answers);

    // Build detailed answer breakdown
    const detailedAnswers = questions.map((question: any) => {
      const answer = answers.find((a: any) => a.questionId === question.id);
      const selectedIndex = answer?.selectedIndex ?? null;
      const isCorrect = selectedIndex === question.correctIndex;

      return {
        questionId: question.id,
        question: question.question,
        options: question.options,
        selectedIndex,
        correctIndex: question.correctIndex,
        isCorrect,
      };
    });

    return NextResponse.json({
      correctCount: result.correctCount,
      coinsAwarded: result.coinsAwarded,
      newBalance: result.newBalance,
      detailedAnswers,
    });
  } catch (error) {
    console.error("Error submitting quiz:", error);
    return NextResponse.json(
      { error: "Failed to submit quiz" },
      { status: 500 }
    );
  }
}
