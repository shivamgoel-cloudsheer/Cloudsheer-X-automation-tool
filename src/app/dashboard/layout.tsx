import Link from "next/link";
import { Logo } from "@/components/ui";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <Logo />
            <span className="text-sm font-semibold text-slate-400">X</span>
          </Link>
          <nav className="flex items-center gap-5 text-sm font-medium text-slate-600">
            <Link href="/dashboard" className="hover:text-slate-900">
              Overview
            </Link>
            <Link href="/dashboard/posts" className="hover:text-slate-900">
              Queue
            </Link>
            <Link
              href="/dashboard/profiles/new"
              className="rounded-lg bg-linear-to-br from-sky-500 to-indigo-600 px-3 py-1.5 text-white shadow-sm transition hover:brightness-110"
            >
              New voice
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  );
}
