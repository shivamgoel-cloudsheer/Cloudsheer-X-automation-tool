import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public marketing landing page.
  if (pathname === "/") return NextResponse.next();

  // Everything else the matcher lets through requires a logged-in teammate.
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!verifySessionToken(token)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip auth pages + auth API, cron endpoints, the X OAuth callback, the
  // public logo, and Next internals; the rest is gated by the session above.
  matcher: [
    "/((?!login|signup|api/auth|api/process|api/dispatch|api/x/callback|_next/|favicon\\.ico|logo\\.png).*)",
  ],
};
