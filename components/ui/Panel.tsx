import { cn } from "@/lib/cn";

export function Panel({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "min-w-0 overflow-hidden rounded-card border border-caribbean-line bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900",
        className
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-caribbean-line px-4 py-3 dark:border-slate-800">
      <div className="min-w-0">
        <h2 className="min-w-0 text-base font-bold leading-tight text-caribbean-ink dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
