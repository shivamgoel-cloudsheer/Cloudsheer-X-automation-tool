import { runDailyProcess } from "@/lib/autopilot";
import { dispatchDue } from "@/lib/dispatch";

export const maxDuration = 300;

// Daily Vercel cron: pull trends, generate posts per profile, schedule the
// autonomous ones, then dispatch as a backstop in case the 10-minute pinger
// has lapsed.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const processed = await runDailyProcess();
  const dispatched = await dispatchDue();
  return Response.json({ processed, dispatched });
}
