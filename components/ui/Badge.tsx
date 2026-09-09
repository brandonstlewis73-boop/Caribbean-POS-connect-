import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "coral" | "amber" | "red" | "teal";
}) {
  const tones = {
    neutral: "border-white/10 bg-white/10 text-slate-200",
    green: "border-emerald-300/20 bg-emerald-400/15 text-emerald-200",
    coral: "border-orange-300/20 bg-orange-400/15 text-orange-200",
    amber: "border-amber-200/20 bg-amber-300/15 text-amber-100",
    red: "border-red-300/20 bg-red-400/15 text-red-200",
    teal: "border-cyan-200/20 bg-cyan-300/15 text-cyan-100"
  };

  return (
    <span data-badge-tone={tone} className={cn("inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-black leading-tight", tones[tone])}>
      {children}
    </span>
  );
}
