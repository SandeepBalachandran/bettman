import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { activateBooster, canActivateBooster } from "@/lib/points-booster";

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const { predictionId } = await request.json();

    if (!predictionId) {
      return NextResponse.json(
        { success: false, error: "Missing predictionId" },
        { status: 400 }
      );
    }

    const result = await activateBooster(user.id, predictionId);

    if (!result.success) {
      const statusCode =
        result.reason === "insufficient_coins" ? 402 :
        result.reason === "prediction_not_found" ? 404 :
        result.reason === "already_used" ? 409 :
        500;

      return NextResponse.json(
        { success: false, error: result.reason },
        { status: statusCode }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error activating booster:", error);
    return NextResponse.json(
      { success: false, error: "Failed to activate booster" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const user = await requireAuth();
    const canActivate = await canActivateBooster(user.id);

    return NextResponse.json({ canActivate });
  } catch (error) {
    console.error("Error checking booster status:", error);
    return NextResponse.json(
      { error: "Failed to check booster status" },
      { status: 500 }
    );
  }
}
