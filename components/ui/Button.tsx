import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "border border-cyan-200/20 bg-cyan-300 text-slate-950 shadow-[0_10px_28px_rgba(34,211,238,0.18)] hover:bg-cyan-200",
  secondary: "border border-white/10 bg-white/[0.075] text-white hover:border-cyan-200/25 hover:bg-white/[0.12]",
  ghost: "text-teal-50 hover:bg-white/[0.08]",
  danger: "border border-red-300/20 bg-red-500/90 text-white hover:bg-red-500",
  success: "border border-emerald-200/20 bg-emerald-400 text-slate-950 hover:bg-emerald-300"
};

const sizes = {
  sm: "min-h-9 px-3 text-sm",
  md: "min-h-11 px-4 text-sm",
  lg: "min-h-12 px-5 text-base",
  icon: "h-11 w-11 p-0"
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "secondary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-card text-center font-black leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
