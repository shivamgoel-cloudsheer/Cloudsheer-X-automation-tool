"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, Loader2, CheckCircle2, Info } from "lucide-react";

type Parsed = {
  id: string;
  text: string;
  createdAt: string;
  likes: number;
  retweets: number;
  isReply: boolean;
};

function parseArchive(content: string): Parsed[] {
  // The archive file looks like: window.YTD.tweets.part0 = [ {...}, ... ]
  const start = content.indexOf("[");
  if (start === -1) throw new Error("This doesn't look like a tweets.js file.");
  const arr = JSON.parse(content.slice(start)) as Array<{
    tweet?: Record<string, unknown>;
  }>;
  const out: Parsed[] = [];
  for (const entry of arr) {
    const t = entry.tweet ?? (entry as unknown as Record<string, unknown>);
    const id = String(t.id_str ?? t.id ?? "");
    if (!id) continue;
    const created = String(t.created_at ?? "");
    const d = new Date(created);
    if (isNaN(d.getTime())) continue;
    out.push({
      id,
      text: String(t.full_text ?? t.text ?? ""),
      createdAt: d.toISOString(),
      likes: Number(t.favorite_count ?? 0) || 0,
      retweets: Number(t.retweet_count ?? 0) || 0,
      isReply: !!t.in_reply_to_status_id_str,
    });
  }
  return out;
}

export default function ImportPage() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const text = await file.text();
      const tweets = parseArchive(text);
      if (tweets.length === 0) throw new Error("No tweets found in that file.");

      const CHUNK = 500;
      let uploaded = 0;
      setProgress({ done: 0, total: tweets.length });
      for (let i = 0; i < tweets.length; i += CHUNK) {
        const chunk = tweets.slice(i, i + CHUNK);
        const res = await fetch("/api/import/tweets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tweets: chunk }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Upload failed");
        uploaded += data.inserted ?? chunk.length;
        setProgress({ done: Math.min(i + CHUNK, tweets.length), total: tweets.length });
      }
      setResult(`Imported ${uploaded} tweets. Check Analytics.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/analytics"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={15} /> Back to analytics
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-slate-900">
          Import past tweets
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Bring your account history (posts + likes/retweets) into Analytics
          from your X data archive. Everything is parsed in your browser - only
          the compact tweet data is uploaded.
        </p>
      </div>

      {/* Instructions */}
      <ol className="space-y-2 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <li>
          <b>1.</b> On X: <b>Settings → Your account → Download an archive of
          your data.</b> X prepares it and emails a link (can take up to 24h).
        </li>
        <li>
          <b>2.</b> Unzip the archive and open the <b>data</b> folder.
        </li>
        <li>
          <b>3.</b> Upload the <b>tweets.js</b> file below (some archives name
          it <b>tweet.js</b>).
        </li>
      </ol>

      {/* Upload */}
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          busy
            ? "border-slate-200 bg-slate-50"
            : "border-slate-300 bg-white hover:border-indigo-400 hover:bg-indigo-50/30"
        }`}
      >
        {busy ? (
          <Loader2 size={22} className="animate-spin text-indigo-500" />
        ) : (
          <Upload size={22} className="text-slate-400" />
        )}
        <span className="text-sm font-medium text-slate-700">
          {busy ? "Importing..." : "Choose your tweets.js file"}
        </span>
        <span className="text-xs text-slate-400">
          Parsed locally, uploaded in batches
        </span>
        <input
          type="file"
          accept=".js,.json,.txt"
          className="hidden"
          disabled={busy}
          onChange={onFile}
        />
      </label>

      {progress && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-linear-to-r from-sky-400 to-indigo-500 transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {progress.done} / {progress.total} processed
          </p>
        </div>
      )}

      {result && (
        <p className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 size={16} /> {result}{" "}
          <Link href="/dashboard/analytics" className="font-medium underline">
            View
          </Link>
        </p>
      )}
      {error && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
          {error}
        </p>
      )}

      <p className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
        <Info size={14} className="mt-0.5 shrink-0" />
        The archive carries likes and retweets but not replies or impressions -
        X doesn&apos;t include those in the export. Re-upload anytime to refresh
        the numbers; tweets are matched by id, so nothing duplicates.
      </p>
    </div>
  );
}
