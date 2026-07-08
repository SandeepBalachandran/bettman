import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { awardDailyCoins } from "@/lib/coin-rewards";

export async function POST() {
  try {
    const user = await requireAuth();
    const result = await awardDailyCoins(user.id);

    return NextResponse.json({
      success: result.reason === "success",
      awarded: result.awarded,
      reason: result.reason,
    });
  } catch (error) {
    console.error("Error claiming daily reward:", error);
    return NextResponse.json(
      { success: false, error: "Failed to claim daily reward" },
      { status: 500 }
    );
  }
}
