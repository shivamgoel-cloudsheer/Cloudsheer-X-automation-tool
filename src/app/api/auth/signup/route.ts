import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword } from "@/lib/password";
import {
  createSessionToken,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const code = String(body?.code ?? "");

  // Invite-code gate: signup is restricted to the team.
  if (!process.env.SIGNUP_CODE || code !== process.env.SIGNUP_CODE) {
    return NextResponse.json({ error: "Invalid invite code." }, { status: 403 });
  }
  if (!email.includes("@") || email.length < 3) {
    return NextResponse.json({ error: "Enter a valid email." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing) {
    return NextResponse.json(
      { error: "That email is already registered. Log in instead." },
      { status: 409 }
    );
  }

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hashPassword(password) })
    .returning({ id: users.id });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/",
  });
  return res;
}
