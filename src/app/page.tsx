import Link from "next/link";
import { Logo } from "@/components/ui";
import { Sparkles, CalendarClock, Bot, ArrowRight, Wand2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      {/* Nav */}
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Logo />
            <span className="text-sm font-semibold text-slate-400">X</span>
          </div>
          <nav className="flex items-center gap-3 text-sm font-medium">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-slate-600 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 px-3.5 py-1.5 text-white shadow-sm transition hover:brightness-110"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200">
            <Sparkles size={13} /> Autonomous posting for X
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Post to X in any voice, on autopilot.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Learn a writing voice from a few example posts, pull the day&apos;s
            trending topics, and let Claude write and publish on a schedule you
            set - hands-off, on brand.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-linear-to-br from-sky-500 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition hover:brightness-110"
            >
              Get started <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Log in
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-5xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Feature
              icon={<Wand2 size={18} />}
              title="Learn a voice"
              body="Paste 50-100 posts from a voice you admire. Claude distils the style once and reuses it on every post."
            />
            <Feature
              icon={<Bot size={18} />}
              title="Write from trends"
              body="It pulls fresh topics for your niche each day and writes posts that sound timely, not generic."
            />
            <Feature
              icon={<CalendarClock size={18} />}
              title="Publish on schedule"
              body="Posts go out automatically at the times you choose, within safe daily limits. Review first or run fully hands-off."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5 text-xs text-slate-400">
          <span>Cloudsheer X</span>
          <span>For the Cloudsheer team</span>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-indigo-600 ring-1 ring-slate-200">
        {icon}
      </div>
      <h3 className="mt-3.5 font-medium text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
