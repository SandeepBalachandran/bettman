import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const questions = await prisma.quizQuestion.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(questions);
  } catch (error) {
    console.error("Error fetching quiz questions:", error);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();

    const { question, options, correctIndex, difficulty } = body;

    if (!question || !Array.isArray(options) || options.length !== 4 || correctIndex === undefined || !difficulty) {
      return NextResponse.json(
        { error: "Invalid question format. Need: question, options (4 items), correctIndex (0-3), difficulty" },
        { status: 400 }
      );
    }

    if (correctIndex < 0 || correctIndex > 3) {
      return NextResponse.json(
        { error: "correctIndex must be between 0 and 3" },
        { status: 400 }
      );
    }

    const newQuestion = await prisma.quizQuestion.create({
      data: {
        question,
        options,
        correctIndex,
        difficulty,
      },
    });

    return NextResponse.json(newQuestion, { status: 201 });
  } catch (error) {
    console.error("Error creating quiz question:", error);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, active } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Question ID required" },
        { status: 400 }
      );
    }

    const updated = await prisma.quizQuestion.update({
      where: { id },
      data: { active },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating quiz question:", error);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}
