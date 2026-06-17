import Link from "next/link";
import { count, desc, gte } from "drizzle-orm";
import {
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Bot,
  PenLine,
} from "lucide-react";
import { db } from "@/db";
import { styleProfiles, posts, postLog } from "@/db/schema";
import { getXAccount } from "@/lib/x-auth";
import { StatusChip } from "@/components/ui";
import { RunNowButton } from "@/components/DashboardActions";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ x?: string }>;
}) {
  const { x } = await searchParams;

  const [acct, profiles, grouped] = await Promise.all([
    getXAccount(),
    db.select().from(styleProfiles).orderBy(desc(styleProfiles.createdAt)),
    db.select({ status: posts.status, n: count() }).from(posts).groupBy(posts.status),
  ]);

  const counts: Record<string, number> = {};
  for (const g of grouped) counts[g.status] = Number(g.n);

  const dayStart = new Date();
  dayStart.setUTCHours(0, 0, 0, 0);
  const [{ value: postedToday }] = await db
    .select({ value: count() })
    .from(postLog)
    .where(gte(postLog.postedAt, dayStart));

  const connected = !!acct?.accessToken;

  return (
    <div className="space-y-6">
      {x === "connected" && (
        <Banner ok>X account connected. You are ready to post.</Banner>
      )}
      {x === "error" && (
        <Banner>Could not connect the X account. Try again.</Banner>
      )}

      {/* X connection */}
      {connected ? (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/60 px-5 py-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="text-emerald-600" size={20} />
            <div>
              <p className="text-sm font-medium text-slate-900">
                Connected as{" "}
                {acct?.xUsername ? `@${acct.xUsername}` : "your X account"}
              </p>
              <p className="text-xs text-slate-500">
                Posts publish automatically at their scheduled times.
              </p>
            </div>
          </div>
          <a
            href="/api/x/connect"
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Reconnect
          </a>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-amber-600" size={20} />
            <div>
              <p className="text-sm font-medium text-slate-900">
                No X account connected
              </p>
              <p className="text-xs text-slate-500">
                Connect once to let the tool post on your behalf.
              </p>
            </div>
          </div>
          <a
            href="/api/x/connect"
            className="rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Connect X
          </a>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="Posted today"
          value={`${Number(postedToday)} / 17`}
          icon={<CheckCircle2 size={16} />}
        />
        <Kpi
          label="Scheduled"
          value={counts.scheduled ?? 0}
          icon={<Sparkles size={16} />}
        />
        <Kpi
          label="Drafts"
          value={counts.draft ?? 0}
          icon={<PenLine size={16} />}
        />
        <Kpi
          label="Voices"
          value={profiles.length}
          icon={<Bot size={16} />}
        />
      </div>

      {/* Profiles */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Voices</h2>
          <RunNowButton />
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
            <p className="text-sm text-slate-600">
              No voices yet. Create one by pasting an influencer&apos;s posts and
              Claude will learn the style.
            </p>
            <Link
              href="/dashboard/profiles/new"
              className="mt-4 inline-flex rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
            >
              Create a voice
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {profiles.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/dashboard/profiles/${p.id}`}
                  className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <p className="truncate font-medium text-slate-900">
                        {p.name}
                      </p>
                      <StatusChip
                        status={p.autonomous ? "scheduled" : "draft"}
                      />
                      <span className="text-xs text-slate-400">
                        {p.autonomous ? "autonomous" : "review first"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {p.niche} &middot; {p.postsPerDay}/day &middot;{" "}
                      {p.profile ? "analyzed" : "not analyzed"} &middot;{" "}
                      {p.model}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-400 group-hover:text-slate-600">
                    Open
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-slate-400">
        <Link href="/dashboard/posts" className="hover:underline">
          View the full post queue
        </Link>
      </p>
    </div>
  );
}

function Banner({
  children,
  ok = false,
}: {
  children: React.ReactNode;
  ok?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-4 py-2.5 text-sm ${
        ok
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-1 ring-red-200"
      }`}
    >
      {children}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
