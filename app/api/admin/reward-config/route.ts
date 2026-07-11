import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const config = await prisma.rewardConfig.findFirst();

    if (!config) {
      // Return defaults if no config exists
      return Response.json({
        boosterCost: 100,
        thirdScorerCost: 50,
        fourthScorerCost: 150,
      });
    }

    return Response.json({
      boosterCost: config.boosterCost,
      thirdScorerCost: config.thirdScorerCost,
      fourthScorerCost: config.fourthScorerCost,
    });
  } catch (error) {
    console.error("Error fetching reward config:", error);
    return Response.json(
      { error: "Failed to fetch reward config" },
      { status: 500 }
    );
  }
}
