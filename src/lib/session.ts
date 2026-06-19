import { createHmac } from "crypto";

// Stateless, signed session cookie. The proxy (edge) verifies it with just an
// HMAC - no DB lookup - so auth checks stay cheap. The token is
// `userId.expiry.signature`, signed with AUTH_SECRET.

export const SESSION_COOKIE = "cs_session";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const SESSION_MAX_AGE_SECONDS = Math.floor(MAX_AGE_MS / 1000);

function sign(payload: string): string {
  return createHmac("sha256", process.env.AUTH_SECRET ?? "")
    .update(payload)
    .digest("hex");
}

export function createSessionToken(userId: string): string {
  const exp = Date.now() + MAX_AGE_MS;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(
  token: string | undefined | null
): { userId: string } | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const payload = `${userId}.${exp}`;
  if (sign(payload) !== sig) return null;
  const expMs = Number(exp);
  if (!expMs || expMs < Date.now()) return null;
  return { userId };
}
