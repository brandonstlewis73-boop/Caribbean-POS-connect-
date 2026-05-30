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
        "min-w-0 overflow-hidden rounded-card border border-white/10 bg-white/[0.05] shadow-soft backdrop-blur-md dark:border-white/10 dark:bg-white/[0.05]",
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
    <div className="flex min-w-0 flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-3.5 sm:px-5">
      <div className="min-w-0">
        <h2 className="min-w-0 text-base font-black leading-tight text-white sm:text-lg">{title}</h2>
        {description ? <p className="mt-1 text-sm font-semibold text-teal-100/60">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
