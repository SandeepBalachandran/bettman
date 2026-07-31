import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireAuth();

    await prisma.user.update({
      where: { id: user.id },
      data: { chatLastReadAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking chat as read:", error);
    return NextResponse.json(
      { error: "Failed to mark chat as read" },
      { status: 500 }
    );
  }
}
