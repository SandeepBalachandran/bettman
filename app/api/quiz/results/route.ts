import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { todayDateString } from "@/lib/quiz";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const userId = user.id;
    const today = todayDateString();

    const attempt = await prisma.quizAttempt.findFirst({
      where: {
        userId,
        date: today,
      },
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "No quiz attempt found for today" },
        { status: 404 }
      );
    }

    // Fetch the current coin balance
    const coinBalance = await prisma.coinBalance.findUnique({
      where: { userId },
    });

    // Rebuild the detailed answer breakdown from the stored attempt
    const storedAnswers = ((attempt.answers ?? []) as unknown) as {
      questionId: string;
      selectedIndex: number;
      correct: boolean;
      answeredInTime: boolean;
    }[];

    const questions = await prisma.quizQuestion.findMany({
      where: { id: { in: storedAnswers.map((a) => a.questionId) } },
    });
    const questionsById = new Map(questions.map((q) => [q.id, q]));

    const detailedAnswers = storedAnswers
      .map((answer) => {
        const question = questionsById.get(answer.questionId);
        if (!question) return null;
        return {
          questionId: answer.questionId,
          question: question.question,
          options: question.options,
          selectedIndex: answer.selectedIndex >= 0 ? answer.selectedIndex : null,
          correctIndex: question.correctIndex,
          isCorrect: answer.correct,
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      correctCount: attempt.correctCount,
      coinsAwarded: attempt.coinsAwarded,
      newBalance: coinBalance?.balance || 0,
      detailedAnswers,
    });
  } catch (error) {
    console.error("Error fetching quiz results:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz results" },
      { status: 500 }
    );
  }
}
