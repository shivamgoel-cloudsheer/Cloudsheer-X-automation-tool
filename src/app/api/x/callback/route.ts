import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCode } from "@/lib/x-auth";

// Step 2: X redirects the browser back here with ?code&state. Validate state
// against the cookie, exchange the code for tokens, store the account.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const base = process.env.APP_URL || origin;

  const jar = await cookies();
  const savedState = jar.get("x_oauth_state")?.value;
  const verifier = jar.get("x_oauth_verifier")?.value;

  if (!code || !state || !verifier || state !== savedState) {
    return NextResponse.redirect(new URL("/dashboard?x=error", base));
  }

  try {
    await exchangeCode({ code, codeVerifier: verifier });
  } catch {
    return NextResponse.redirect(new URL("/dashboard?x=error", base));
  }

  const res = NextResponse.redirect(new URL("/dashboard?x=connected", base));
  res.cookies.delete("x_oauth_state");
  res.cookies.delete("x_oauth_verifier");
  return res;
}
