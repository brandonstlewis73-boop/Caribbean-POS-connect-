import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "coral" | "amber" | "red" | "teal";
}) {
  const tones = {
    neutral: "bg-white/10 text-slate-200",
    green: "bg-emerald-400/15 text-emerald-200",
    coral: "bg-orange-400/15 text-orange-200",
    amber: "bg-amber-300/15 text-amber-100",
    red: "bg-red-400/15 text-red-200",
    teal: "bg-cyan-300/15 text-cyan-100"
  };

  return (
    <span className={cn("inline-flex items-center rounded-full border border-white/10 px-2.5 py-1 text-xs font-black", tones[tone])}>
      {children}
    </span>
  );
}
