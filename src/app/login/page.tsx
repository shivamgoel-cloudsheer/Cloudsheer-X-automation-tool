"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { Logo } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not log in");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in");
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-sm">
        <div className="flex justify-center">
          <Link href="/">
            <Logo size="lg" />
          </Link>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Log in</h1>
          <p className="mt-1 text-sm text-slate-500">
            Welcome back to Cloudsheer X.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@cloudsheer.com"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <LogIn size={15} />
              )}
              Log in
            </button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-slate-500">
          No account?{" "}
          <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
