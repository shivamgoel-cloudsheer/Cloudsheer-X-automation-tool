import { eq } from "drizzle-orm";
import { TwitterApi } from "twitter-api-v2";
import { db } from "@/db";
import { xAccount } from "@/db/schema";

// OAuth 2.0 user-context scopes. offline.access is required to receive a
// refresh token (X access tokens expire after ~2h).
export const X_SCOPES = [
  "tweet.read",
  "tweet.write",
  "users.read",
  "offline.access",
] as const;

export const X_ACCOUNT_ID = "default";

export class XNotConnectedError extends Error {
  constructor(message = "No X account is connected. Connect one from the dashboard.") {
    super(message);
    this.name = "XNotConnectedError";
  }
}

function callbackUrl(): string {
  const url = process.env.X_CALLBACK_URL;
  if (!url) throw new Error("X_CALLBACK_URL is not set.");
  return url;
}

/** Confidential app client used to mint links, exchange codes, and refresh. */
function appClient(): TwitterApi {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("X_CLIENT_ID / X_CLIENT_SECRET are not set.");
  }
  return new TwitterApi({ clientId, clientSecret });
}

/** Step 1 of connect: build the consent URL + the PKCE verifier/state to stash
 *  in cookies until the callback. */
export function buildAuthLink(): { url: string; state: string; codeVerifier: string } {
  const { url, state, codeVerifier } = appClient().generateOAuth2AuthLink(
    callbackUrl(),
    { scope: [...X_SCOPES] }
  );
  // twitter-api-v2 emits the PKCE method lowercase ("s256"); OAuth 2.0 / RFC
  // 7636 and X require uppercase "S256". X rejects the lowercase form with
  // "You weren't able to give access to the App", so normalize it here.
  const fixedUrl = url.replace(
    "code_challenge_method=s256",
    "code_challenge_method=S256"
  );
  // Guard against a future twitter-api-v2 change silently reverting the casing.
  if (!fixedUrl.includes("code_challenge_method=S256")) {
    throw new Error("X authorize URL is missing the required S256 PKCE method.");
  }
  return { url: fixedUrl, state, codeVerifier };
}

/** Step 2 of connect: exchange the code for tokens, confirm the account, and
 *  upsert the single x_account row. */
export async function exchangeCode(args: {
  code: string;
  codeVerifier: string;
}): Promise<{ username: string | null }> {
  const { client, accessToken, refreshToken, expiresIn, scope } =
    await appClient().loginWithOAuth2({
      code: args.code,
      codeVerifier: args.codeVerifier,
      redirectUri: callbackUrl(),
    });

  // Confirm which account we just connected.
  let xUserId: string | null = null;
  let xUsername: string | null = null;
  try {
    const me = await client.v2.me();
    xUserId = me.data.id;
    xUsername = me.data.username;
  } catch {
    // Non-fatal: tokens are still valid even if the lookup hiccups.
  }

  const expiresAt = Math.floor(Date.now() / 1000) + (expiresIn ?? 7200);
  const row = {
    id: X_ACCOUNT_ID,
    xUserId,
    xUsername,
    accessToken,
    refreshToken: refreshToken ?? null,
    expiresAt,
    scope: Array.isArray(scope) ? scope.join(" ") : null,
    updatedAt: new Date(),
  };

  await db
    .insert(xAccount)
    .values(row)
    .onConflictDoUpdate({ target: xAccount.id, set: row });

  return { username: xUsername };
}

export async function getXAccount() {
  const [row] = await db
    .select()
    .from(xAccount)
    .where(eq(xAccount.id, X_ACCOUNT_ID));
  return row ?? null;
}

/** Forces a token refresh regardless of expiry; persists the rotated refresh
 *  token. Used after a 401 from the API. */
export async function refreshXToken(): Promise<string> {
  const acct = await getXAccount();
  if (!acct?.refreshToken) {
    throw new XNotConnectedError(
      "X session expired and no refresh token is stored. Reconnect the account."
    );
  }
  const refreshed = await appClient().refreshOAuth2Token(acct.refreshToken);
  await db
    .update(xAccount)
    .set({
      accessToken: refreshed.accessToken,
      // X rotates the refresh token on every refresh; keep the old one only if
      // a new one wasn't returned.
      refreshToken: refreshed.refreshToken ?? acct.refreshToken,
      expiresAt: Math.floor(Date.now() / 1000) + (refreshed.expiresIn ?? 7200),
      updatedAt: new Date(),
    })
    .where(eq(xAccount.id, X_ACCOUNT_ID));
  return refreshed.accessToken;
}

/** Returns a live access token, refreshing it when it is within 60s of
 *  expiry. Throws XNotConnectedError when no account is linked. */
export async function getValidXAccessToken(): Promise<string> {
  const acct = await getXAccount();
  if (!acct?.accessToken) throw new XNotConnectedError();

  const expiresAtMs = (acct.expiresAt ?? 0) * 1000;
  if (expiresAtMs > Date.now() + 60_000) {
    return acct.accessToken;
  }
  return refreshXToken();
}
