import { cn } from "@/lib/cn";

export function Panel({
  children,
  className,
  id
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "ui-panel min-w-0 overflow-hidden rounded-3xl border border-cyan-200/12 bg-[rgba(11,29,46,0.88)] shadow-[0_20px_70px_rgba(0,0,0,0.30)] dark:border-cyan-200/12",
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
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4 border-b border-cyan-200/10 px-5 py-5 sm:px-6">
      <div className="min-w-0 flex-1">
        <h2 className="min-w-0 text-base font-black leading-tight text-white sm:text-lg">{title}</h2>
        {description ? <p className="mt-1 max-w-2xl text-sm font-semibold leading-5 text-slate-300">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
