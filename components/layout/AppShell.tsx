import Link from "next/link";
import {
  BarChart3,
  Boxes,
  CreditCard,
  ClipboardList,
  LifeBuoy,
  LayoutDashboard,
  MapPinned,
  Printer,
  ReceiptText,
  Settings,
  ShoppingCart,
  UserCog,
  UsersRound
} from "lucide-react";
import { APP_NAME, CURRENCY_CODE, getDefaultCountryForCurrency } from "@/lib/constants";
import { cn } from "@/lib/cn";
import { getSettings } from "@/lib/data";

const navGroups = [
  {
    label: "Front Office",
    items: [
      { label: "POS", href: "/pos", icon: ShoppingCart },
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Receipts", href: "/receipts", icon: ReceiptText },
      { label: "Deliveries", href: "/deliveries", icon: MapPinned },
      { label: "Printer", href: "/printer", icon: Printer }
    ]
  },
  {
    label: "Back Office",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Reports", href: "/reports", icon: BarChart3 }
    ]
  },
  {
    label: "Business",
    items: [
      { label: "Staff", href: "/staff", icon: UserCog },
      { label: "Subscription", href: "/subscription", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Help & Support", href: "/help", icon: LifeBuoy }
    ]
  }
];

const navItems = navGroups.flatMap((group) => group.items);

export async function AppShell({
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
  const settings = await getSettings().catch(() => null);
  const currency = settings?.currency || CURRENCY_CODE;
  const market = getDefaultCountryForCurrency(currency);

  return (
    <div className="min-h-screen overflow-x-hidden text-white">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 overflow-y-auto border-r border-white/10 bg-black/35 px-4 py-5 backdrop-blur-2xl lg:block">
        <Link href="/dashboard" className="mb-6 flex min-w-0 items-center gap-3 rounded-card border border-white/10 bg-white/[0.06] px-3 py-3">
          <img src="/logo.svg" alt="" className="h-12 w-12 shrink-0 rounded-2xl object-contain" />
          <span className="min-w-0">
            <span className="block text-sm font-black leading-tight text-white">{APP_NAME}</span>
            <span className="text-xs font-bold text-cyan-200/70">Live POS / {currency}</span>
          </span>
        </Link>
        <nav className="grid gap-5">
          {navGroups.map((group) => (
            <div key={group.label} className="grid gap-1.5">
              <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-teal-100/45">{group.label}</p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const selected = item.label === active;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex h-11 min-w-0 items-center gap-3 rounded-card px-3 text-sm font-black transition",
                      selected
                        ? "bg-gradient-to-r from-teal-400 to-cyan-300 text-slate-950 shadow-[0_12px_34px_rgba(20,184,166,0.24)]"
                        : "text-teal-50/72 hover:bg-white/[0.07] hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/10 bg-black/30 px-4 py-3 backdrop-blur-2xl">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200/60">
                {market} / {currency}
              </p>
              <h1 className="min-w-0 text-xl font-black leading-tight sm:text-2xl">{title}</h1>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Link
                href="/online"
                className="inline-flex min-h-10 items-center rounded-card border border-white/10 bg-white/[0.06] px-3 py-2 text-center text-sm font-black leading-tight text-teal-50 hover:bg-white/[0.1]"
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
                  "whitespace-nowrap rounded-card px-3 py-2 text-sm font-black",
                  item.label === active
                    ? "bg-cyan-300 text-slate-950"
                    : "border border-white/10 bg-white/[0.06] text-teal-50"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="min-w-0 max-w-full overflow-x-hidden px-4 pb-24 pt-4 sm:px-5 lg:px-6 lg:pb-6">{children}</main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-white/10 bg-black/75 px-2 py-2 backdrop-blur-2xl lg:hidden">
        {[
          navItems.find((item) => item.label === "Dashboard"),
          navItems.find((item) => item.label === "POS"),
          navItems.find((item) => item.label === "Orders"),
          navItems.find((item) => item.label === "Receipts"),
          navItems.find((item) => item.label === "Settings")
        ].filter(Boolean).map((item) => {
          const entry = item!;
          const Icon = entry.icon;
          const selected = entry.label === active;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={cn(
                "grid min-h-12 place-items-center gap-0.5 rounded-card px-1 text-[11px] font-black leading-tight",
                selected ? "bg-cyan-300 text-slate-950" : "text-teal-50/75"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{entry.label}</span>
            </Link>
          );
        })}
      </nav>
      <Link
        href="/help"
        className={cn(
          "fixed bottom-20 right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-black shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:bottom-5",
          active === "Help & Support"
            ? "bg-cyan-300 text-slate-950"
            : "bg-black/70 text-teal-50 hover:bg-white/[0.14]"
        )}
      >
        <LifeBuoy className="h-4 w-4" />
        Help
      </Link>
    </div>
  );
}
