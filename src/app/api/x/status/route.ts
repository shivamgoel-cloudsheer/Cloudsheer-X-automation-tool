import { getXAccount } from "@/lib/x-auth";

// Lightweight connection check for the dashboard banner.
export async function GET() {
  const acct = await getXAccount();
  return Response.json({
    connected: !!acct?.accessToken,
    username: acct?.xUsername ?? null,
    expiresAt: acct?.expiresAt ?? null,
  });
}
