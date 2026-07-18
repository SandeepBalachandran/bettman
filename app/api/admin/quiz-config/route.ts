import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { invalidateQuizConfigCache } from "@/lib/quiz";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    let config = await prisma.quizConfig.findFirst();

    if (!config) {
      config = await prisma.quizConfig.create({
        data: {
          questionsPerQuiz: 7,
          secondsPerQuestion: 10,
          completionCoins: 20,
          coinsPerCorrect: 10,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching quiz config:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz config" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    let config = await prisma.quizConfig.findFirst();

    if (!config) {
      config = await prisma.quizConfig.create({
        data: {
          questionsPerQuiz: body.questionsPerQuiz ?? 7,
          secondsPerQuestion: body.secondsPerQuestion ?? 10,
          completionCoins: body.completionCoins ?? 20,
          coinsPerCorrect: body.coinsPerCorrect ?? 10,
        },
      });
    } else {
      config = await prisma.quizConfig.update({
        where: { id: config.id },
        data: {
          questionsPerQuiz: body.questionsPerQuiz ?? config.questionsPerQuiz,
          secondsPerQuestion: body.secondsPerQuestion ?? config.secondsPerQuestion,
          completionCoins: body.completionCoins ?? config.completionCoins,
          coinsPerCorrect: body.coinsPerCorrect ?? config.coinsPerCorrect,
        },
      });
    }

    invalidateQuizConfigCache();

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating quiz config:", error);
    return NextResponse.json(
      { error: "Failed to update quiz config" },
      { status: 500 }
    );
  }
}
