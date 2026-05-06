import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, className, ...props }: Props) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-caribbean-ink dark:text-white">
      <span className="min-w-0 leading-tight">{label}</span>
      <input
        className={cn(
          "h-10 w-full min-w-0 rounded-card border border-caribbean-line bg-white px-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-teal-950",
          className
        )}
        {...props}
      />
    </label>
  );
}

export function SelectField({
  label,
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-caribbean-ink dark:text-white">
      <span className="min-w-0 leading-tight">{label}</span>
      <select
        className={cn(
          "h-10 w-full min-w-0 rounded-card border border-caribbean-line bg-white px-3 text-sm font-medium outline-none transition focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-teal-950",
          className
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function TextAreaField({
  label,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-semibold text-caribbean-ink dark:text-white">
      <span className="min-w-0 leading-tight">{label}</span>
      <textarea
        className={cn(
          "min-h-24 w-full min-w-0 rounded-card border border-caribbean-line bg-white px-3 py-2 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:focus:ring-teal-950",
          className
        )}
        {...props}
      />
    </label>
  );
}
