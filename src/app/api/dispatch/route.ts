import { dispatchDue } from "@/lib/dispatch";

export const maxDuration = 300;

// Cron trigger (cron-job.org, every ~10 min): publishes every scheduled post
// whose time has come, up to the free-tier daily cap.
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchDue();
  return Response.json(result);
}
