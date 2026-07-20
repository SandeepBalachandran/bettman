import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFeatureFlags, effectiveFlags } from "@/lib/feature-flags";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const flags = await getFeatureFlags();
    return NextResponse.json(effectiveFlags(flags, session.user.role));
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}
