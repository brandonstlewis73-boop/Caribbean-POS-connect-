import { cn } from "@/lib/cn";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "coral" | "amber" | "red" | "teal";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    green: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-200",
    coral: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-200",
    amber: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
    red: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-200",
    teal: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
  };

  return (
    <span className={cn("inline-flex items-center rounded px-2 py-1 text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}
