import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const user = session.user;

    let config = await prisma.rewardConfig.findFirst();

    if (!config) {
      config = await prisma.rewardConfig.create({
        data: {
          boosterCost: 100,
          thirdScorerCost: 50,
          fourthScorerCost: 150,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error fetching reward config:", error);
    return NextResponse.json(
      { error: "Failed to fetch config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const user = session.user;

    const { boosterCost, thirdScorerCost, fourthScorerCost } = await request.json();

    if (
      typeof boosterCost !== "number" ||
      typeof thirdScorerCost !== "number" ||
      typeof fourthScorerCost !== "number"
    ) {
      return NextResponse.json(
        { error: "Invalid input types" },
        { status: 400 }
      );
    }

    if (boosterCost < 0 || thirdScorerCost < 0 || fourthScorerCost < 0) {
      return NextResponse.json(
        { error: "Prices cannot be negative" },
        { status: 400 }
      );
    }

    let config = await prisma.rewardConfig.findFirst();

    if (!config) {
      config = await prisma.rewardConfig.create({
        data: {
          boosterCost,
          thirdScorerCost,
          fourthScorerCost,
        },
      });
    } else {
      config = await prisma.rewardConfig.update({
        where: { id: config.id },
        data: {
          boosterCost,
          thirdScorerCost,
          fourthScorerCost,
        },
      });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error("Error updating reward config:", error);
    return NextResponse.json(
      { error: "Failed to update config" },
      { status: 500 }
    );
  }
}
