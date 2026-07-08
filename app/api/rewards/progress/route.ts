import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { getRewardProgress } from "@/lib/coin-rewards";

export async function GET() {
  try {
    const user = await requireAuth();
    const progress = await getRewardProgress(user.id);

    return NextResponse.json(progress);
  } catch (error) {
    console.error("Error fetching reward progress:", error);
    return NextResponse.json(
      { error: "Failed to fetch reward progress" },
      { status: 500 }
    );
  }
}
