import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import {
  FEATURE_FLAG_KEYS,
  invalidateFeatureFlagsCache,
} from "@/lib/feature-flags";

export async function GET() {
  try {
    await requireAdmin();

    let flags = await prisma.featureFlags.findFirst();
    if (!flags) {
      flags = await prisma.featureFlags.create({ data: {} });
    }
    return NextResponse.json(flags);
  } catch (error) {
    console.error("Error fetching feature flags:", error);
    return NextResponse.json(
      { error: "Failed to fetch feature flags" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();

    // Only accept known keys, all must be booleans
    const data: Record<string, boolean> = {};
    for (const key of FEATURE_FLAG_KEYS) {
      if (key in body) {
        if (typeof body[key] !== "boolean") {
          return NextResponse.json(
            { error: `Invalid value for ${key}` },
            { status: 400 }
          );
        }
        data[key] = body[key];
      }
    }

    const existing = await prisma.featureFlags.findFirst();
    const updated = existing
      ? await prisma.featureFlags.update({ where: { id: existing.id }, data })
      : await prisma.featureFlags.create({ data });

    invalidateFeatureFlagsCache();

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating feature flags:", error);
    return NextResponse.json(
      { error: "Failed to update feature flags" },
      { status: 500 }
    );
  }
}
