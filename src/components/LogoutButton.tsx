"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-900"
      title="Log out"
    >
      <LogOut size={15} />
    </button>
  );
}
