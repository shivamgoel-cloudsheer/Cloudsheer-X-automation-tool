import { NextResponse } from "next/server";
import { buildAuthLink } from "@/lib/x-auth";

// Step 1 of connecting the X account: redirect to X's consent screen, stashing
// the PKCE verifier + state in short-lived httpOnly cookies for the callback.
export async function GET() {
  let link: { url: string; state: string; codeVerifier: string };
  try {
    link = buildAuthLink();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }

  const res = NextResponse.redirect(link.url);
  const opts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 600, // 10 minutes to complete consent
    path: "/",
  };
  res.cookies.set("x_oauth_state", link.state, opts);
  res.cookies.set("x_oauth_verifier", link.codeVerifier, opts);
  return res;
}
