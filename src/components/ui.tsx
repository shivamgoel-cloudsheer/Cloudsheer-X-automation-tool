import Image from "next/image";

// Full Cloudsheer brand lockup. Sized by height; width scales with the
// 762x252 source aspect ratio.
export function Logo({ size = "md" }: { size?: "md" | "lg" }) {
  const cls = size === "lg" ? "h-11 w-auto" : "h-7 w-auto";
  return (
    <Image
      src="/logo.png"
      alt="Cloudsheer"
      width={762}
      height={252}
      priority
      className={cls}
    />
  );
}

export const STATUS_CHIP: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  approved: "bg-sky-50 text-sky-700 ring-sky-200",
  scheduled: "bg-amber-50 text-amber-700 ring-amber-200",
  posting: "bg-violet-50 text-violet-700 ring-violet-200",
  posted: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  failed: "bg-red-50 text-red-700 ring-red-200",
  cancelled: "bg-slate-100 text-slate-400 ring-slate-200",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_CHIP[status] ?? STATUS_CHIP.draft
      }`}
    >
      {status}
    </span>
  );
}
