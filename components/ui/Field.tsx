import { cn } from "@/lib/cn";

type Props = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Field({ label, className, ...props }: Props) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-teal-50">
      <span className="min-w-0 leading-tight text-teal-50/86">{label}</span>
      <input
        className={cn(
          "min-h-11 w-full min-w-0 rounded-card border border-white/10 bg-slate-950/45 px-3 text-sm font-semibold text-white outline-none transition-colors duration-100 placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20",
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
    <label className="grid min-w-0 gap-2 text-sm font-bold text-teal-50">
      <span className="min-w-0 leading-tight text-teal-50/86">{label}</span>
      <select
        className={cn(
          "min-h-11 w-full min-w-0 rounded-card border border-white/10 bg-slate-950/45 px-3 text-sm font-semibold text-white outline-none transition-colors duration-100 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20",
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
    <label className="grid min-w-0 gap-2 text-sm font-bold text-teal-50">
      <span className="min-w-0 leading-tight text-teal-50/86">{label}</span>
      <textarea
        className={cn(
          "min-h-28 w-full min-w-0 rounded-card border border-white/10 bg-slate-950/45 px-3 py-3 text-sm font-semibold text-white outline-none transition-colors duration-100 placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20",
          className
        )}
        {...props}
      />
    </label>
  );
}
