"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Info,
  CheckCircle2,
  CalendarClock,
  PenLine,
  XCircle,
} from "lucide-react";

type Analytics = {
  usage: {
    today: number;
    dailyCap: number;
    month: number;
    monthlyCap: number;
    total: number;
  };
  byStatus: Record<string, number>;
  daily: { day: string; count: number }[];
  voices: {
    name: string;
    posted: number;
    scheduled: number;
    drafts: number;
    failed: number;
    total: number;
  }[];
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/analytics", { cache: "no-store" });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  if (!data) {
    return (
      <div className="flex justify-center py-20 text-slate-400">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  const { usage, byStatus, daily, voices } = data;
  const maxDay = Math.max(1, ...daily.map((d) => d.count));

  return (
    <div className="space-y-7">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={15} /> Back
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Posting activity and free-tier usage for @cloudsheerhub.
        </p>
      </div>

      {/* Free-tier usage */}
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          X free-tier usage
        </h2>
        <Meter
          label="Today"
          sub="Daily rate limit on POST /2/tweets - resets at 00:00 UTC"
          value={usage.today}
          cap={usage.dailyCap}
        />
        <Meter
          label="This month"
          sub="Monthly post allowance on the free tier"
          value={usage.month}
          cap={usage.monthlyCap}
        />
        <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
          <Info size={14} className="mt-0.5 shrink-0" />
          X&apos;s free API tier allows <b className="mx-1 text-slate-700">17 posts / 24 hours</b>
          and <b className="mx-1 text-slate-700">500 posts / month</b>. The tool stops
          before those limits so posts never fail with a rate-limit error -
          anything over the daily cap simply waits for the next day.
        </p>
      </section>

      {/* Pipeline */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Post pipeline</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Posted (all time)"
            value={usage.total}
            icon={<CheckCircle2 size={15} />}
            tone="emerald"
          />
          <Stat
            label="Scheduled"
            value={byStatus.scheduled ?? 0}
            icon={<CalendarClock size={15} />}
            tone="amber"
          />
          <Stat
            label="Drafts"
            value={(byStatus.draft ?? 0) + (byStatus.approved ?? 0)}
            icon={<PenLine size={15} />}
            tone="slate"
          />
          <Stat
            label="Failed"
            value={byStatus.failed ?? 0}
            icon={<XCircle size={15} />}
            tone="red"
          />
        </div>
      </section>

      {/* Daily activity chart */}
      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-900">
          Posting activity - last 14 days
        </h2>
        <div className="flex h-40 items-end gap-1.5">
          {daily.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t bg-linear-to-t from-sky-500 to-indigo-500"
                  style={{ height: `${(d.count / maxDay) * 100}%` }}
                  title={`${d.count} on ${d.day}`}
                />
              </div>
              <span className="text-[10px] text-slate-400">
                {d.day.slice(8)}
              </span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-slate-400">
          Posts published per day (UTC). Bars are empty until your first post
          goes out.
        </p>
      </section>

      {/* Per-voice */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">By voice</h2>
        {voices.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-8 text-center text-sm text-slate-500">
            No voices yet. Create one to start tracking output per voice.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-400">
                  <th className="px-4 py-2.5 font-medium">Voice</th>
                  <th className="px-3 py-2.5 text-right font-medium">Posted</th>
                  <th className="px-3 py-2.5 text-right font-medium">Scheduled</th>
                  <th className="px-3 py-2.5 text-right font-medium">Drafts</th>
                  <th className="px-3 py-2.5 text-right font-medium">Failed</th>
                </tr>
              </thead>
              <tbody>
                {voices.map((v) => (
                  <tr key={v.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{v.name}</td>
                    <td className="px-3 py-2.5 text-right text-emerald-700">{v.posted}</td>
                    <td className="px-3 py-2.5 text-right text-amber-700">{v.scheduled}</td>
                    <td className="px-3 py-2.5 text-right text-slate-600">{v.drafts}</td>
                    <td className="px-3 py-2.5 text-right text-red-600">{v.failed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        Engagement metrics (likes, impressions, replies) need X&apos;s paid API
        tier - the free tier is write-only. These analytics cover your posting
        throughput. For engagement, check X&apos;s native analytics dashboard.
      </p>
    </div>
  );
}

function Meter({
  label,
  sub,
  value,
  cap,
}: {
  label: string;
  sub: string;
  value: number;
  cap: number;
}) {
  const pct = Math.min(100, (value / cap) * 100);
  const near = pct >= 80;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm tabular-nums text-slate-500">
          <b className="text-slate-900">{value}</b> / {cap}
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className={`h-full rounded-full ${
            near
              ? "bg-linear-to-r from-amber-400 to-red-500"
              : "bg-linear-to-r from-sky-400 to-indigo-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: "text-emerald-600",
  amber: "text-amber-600",
  slate: "text-slate-500",
  red: "text-red-600",
};

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`flex items-center gap-1.5 ${TONE[tone]}`}>
        {icon}
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
