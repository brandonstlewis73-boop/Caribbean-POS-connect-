import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  MapPinned,
  PackageSearch,
  Settings,
  ShoppingCart,
  UsersRound
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "POS", href: "/pos", icon: ShoppingCart },
  { label: "Orders", href: "/orders", icon: ClipboardList },
  { label: "Customers", href: "/customers", icon: UsersRound },
  { label: "Inventory", href: "/inventory", icon: Boxes },
  { label: "Deliveries", href: "/deliveries", icon: MapPinned },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function AppShell({
  active,
  title,
  children,
  actions
}: {
  active: string;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-caribbean-cloud text-caribbean-ink dark:bg-slate-950 dark:text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 overflow-y-auto border-r border-caribbean-line bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-950 lg:block">
        <Link href="/" className="mb-5 flex min-w-0 items-center gap-3 rounded-card px-2 py-2">
          <img src="/logo.svg" alt="" className="h-11 w-11 shrink-0 rounded-card object-contain" />
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight">{APP_NAME}</span>
            <span className="text-xs font-semibold text-slate-500">TTD operations console</span>
          </span>
        </Link>
        <nav className="grid gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const selected = item.label === active;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex h-11 min-w-0 items-center gap-3 rounded-card px-3 text-sm font-bold transition",
                  selected
                    ? "bg-caribbean-teal text-white"
                    : "text-slate-600 hover:bg-caribbean-cloud hover:text-caribbean-ink dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="min-w-0">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-caribbean-line bg-white/92 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-normal text-caribbean-teal">
                Trinidad and Tobago
              </p>
              <h1 className="min-w-0 text-xl font-black leading-tight sm:text-2xl">{title}</h1>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href="/online"
                className="inline-flex min-h-10 items-center rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-bold leading-tight text-slate-700 hover:bg-caribbean-cloud dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
              >
                Storefront
              </Link>
              {actions}
            </div>
          </div>
          <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-card px-3 py-2 text-sm font-bold",
                  item.label === active
                    ? "bg-caribbean-teal text-white"
                    : "border border-caribbean-line bg-white dark:border-slate-700 dark:bg-slate-900"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-4 sm:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
