import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "bg-gradient-to-r from-teal-400 via-cyan-400 to-emerald-400 text-slate-950 shadow-[0_12px_34px_rgba(20,184,166,0.24)] hover:brightness-110",
  secondary: "border border-white/10 bg-white/[0.07] text-white hover:bg-white/[0.12]",
  ghost: "text-teal-50 hover:bg-white/[0.08]",
  danger: "bg-red-500/90 text-white hover:bg-red-500",
  success: "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
};

const sizes = {
  sm: "h-9 px-3 text-sm",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-5 text-base",
  icon: "h-10 w-10 p-0"
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
