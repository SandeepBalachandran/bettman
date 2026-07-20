import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { isFeatureEnabledForCurrentUser } from "@/lib/feature-flags";
import { awardDailyCoins } from "@/lib/coin-rewards";

export async function POST() {
  try {
    const user = await requireAuth();
    if (!(await isFeatureEnabledForCurrentUser("dailyCoins"))) {
      return NextResponse.json({ error: "Feature disabled" }, { status: 403 });
    }
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
