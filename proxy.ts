import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth();

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!login|signup|verify-email|api/auth|_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|icons/|sw.js|manifest.webmanifest|$).*)",
  ],
};
