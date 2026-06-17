import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, gateToken } from "@/lib/gate";

export function proxy(request: NextRequest) {
  // Site-wide password gate. This is the only auth: the tool drives a single
  // X account, so there is no per-user login.
  if (process.env.ACCESS_PASSWORD) {
    const token = request.cookies.get(GATE_COOKIE)?.value;
    if (token !== gateToken()) {
      return NextResponse.redirect(new URL("/gate", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Everything EXCEPT routes external systems must reach without the gate:
  // - /api/process  (daily Vercel cron, guarded by CRON_SECRET)
  // - /api/dispatch (10-min external cron, guarded by CRON_SECRET)
  // - /api/x/callback (X redirects the browser back here mid-OAuth)
  // - /gate (the password form itself), Next assets, favicon
  matcher: [
    "/((?!gate|api/process|api/dispatch|api/x/callback|_next/|favicon\\.ico).*)",
  ],
};
