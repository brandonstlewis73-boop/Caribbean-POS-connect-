import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg" | "icon";
};

const variants = {
  primary: "bg-caribbean-teal text-white hover:bg-teal-700",
  secondary: "border border-caribbean-line bg-white text-caribbean-ink hover:bg-caribbean-cloud dark:border-slate-700 dark:bg-slate-900 dark:text-white",
  ghost: "text-caribbean-ink hover:bg-caribbean-cloud dark:text-white dark:hover:bg-slate-800",
  danger: "bg-red-600 text-white hover:bg-red-700",
  success: "bg-caribbean-palm text-white hover:bg-green-700"
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
        "inline-flex min-w-0 items-center justify-center gap-2 rounded-card text-center font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-caribbean-teal disabled:cursor-not-allowed disabled:opacity-55",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
