"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  CreditCard,
  ClipboardList,
  LifeBuoy,
  LayoutDashboard,
  MapPinned,
  Menu,
  Printer,
  ReceiptText,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  UserCog,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { cn } from "@/lib/cn";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const navGroups: { label: string; items: NavItem[] }[] = [
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
      { label: "Categories", href: "/categories", icon: Tags },
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

const bottomNavItems = ["Dashboard", "POS", "Orders", "Receipts", "Settings"]
  .map((label) => navItems.find((item) => item.label === label))
  .filter((item): item is NavItem => Boolean(item));

export function AppShellClient({
  active,
  title,
  children,
  actions,
  currency,
  market
}: {
  active: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  currency: string;
  market: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden text-caribbean-ink">
      <aside className="glass-panel fixed inset-y-0 left-0 z-30 hidden w-sidebar overflow-y-auto border-r border-white/10 px-4 py-5 lg:block">
        <SidebarContent active={active} currency={currency} />
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "glass-panel-strong fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[280px] overflow-y-auto px-4 py-5 transition-transform duration-300 ease-out lg:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/60">
            Navigation
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            className="touch-target inline-grid place-items-center rounded-card border border-white/10 bg-white/[0.06] text-teal-50 transition hover:bg-white/[0.12]"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent active={active} currency={currency} onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="min-w-0 lg:pl-sidebar">
        <header className="glass-panel-strong sticky top-0 z-30 border-x-0 border-t-0 px-3 py-3 sm:px-5 lg:px-6">
          <div className="flex min-h-[56px] min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                className="touch-target inline-grid shrink-0 place-items-center rounded-card border border-white/10 bg-white/[0.07] text-teal-50 shadow-soft transition hover:border-cyan-200/35 hover:bg-white/[0.12] lg:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-xs">
                  {market} / {currency}
                </p>
                <h1 className="min-w-0 text-lg font-black leading-tight text-white xs:text-xl sm:text-2xl lg:text-3xl">
                  {title}
                </h1>
              </div>
            </div>

            <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
              <Link
                href="/online"
                className="inline-flex min-h-10 items-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 py-2 text-center text-sm font-black leading-tight text-teal-50 shadow-soft transition hover:border-cyan-200/35 hover:bg-white/[0.12]"
              >
                <Store className="h-4 w-4 shrink-0" />
                <span>Storefront</span>
              </Link>
              {actions}
            </div>
          </div>

          <nav className="scrollbar-none mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {navItems.map((item) => {
              const selected = item.label === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center rounded-card px-3 py-2 text-sm font-black transition",
                    selected
                      ? "bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-950 shadow-glow"
                      : "border border-white/10 bg-white/[0.06] text-teal-50/85 hover:bg-white/[0.12] hover:text-white"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="animate-fade-in min-w-0 max-w-full overflow-x-hidden px-3 pb-[calc(var(--bottom-nav-height)+1.5rem)] pt-4 xs:px-4 sm:px-5 lg:px-6 lg:pb-8">
          {children}
        </main>
      </div>

      <BottomNavigation active={active} />

      <Link
        href="/help"
        className={cn(
          "fixed bottom-[calc(var(--bottom-nav-height)+1rem)] right-4 z-40 inline-flex min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-black shadow-glow backdrop-blur-2xl transition hover:-translate-y-0.5 lg:bottom-5",
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

function SidebarContent({
  active,
  currency,
  onNavigate
}: {
  active: string;
  currency: string;
  onNavigate?: () => void;
}) {
  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-6 flex min-w-0 items-center gap-3 rounded-panel border border-white/10 bg-gradient-to-br from-white/[0.1] to-white/[0.04] px-3 py-3 shadow-soft transition hover:border-cyan-200/30"
      >
        <Image
          src="/logo.svg"
          alt=""
          width={48}
          height={48}
          className="h-12 w-12 shrink-0 rounded-card object-contain glow-accent"
        />
        <span className="min-w-0">
          <span className="block text-sm font-black leading-tight text-white">{APP_NAME}</span>
          <span className="text-xs font-bold text-cyan-200/70">Live POS / {currency}</span>
        </span>
      </Link>

      <nav className="grid gap-5">
        {navGroups.map((group) => (
          <div key={group.label} className="grid gap-1.5">
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-teal-100/45">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const selected = item.label === active;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex min-h-11 min-w-0 items-center gap-3 rounded-card px-3 text-sm font-black transition duration-200",
                    selected
                      ? "bg-gradient-to-r from-teal-300 to-cyan-300 text-slate-950 shadow-glow"
                      : "text-teal-50/75 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition",
                      selected ? "text-slate-950" : "text-cyan-100/70 group-hover:text-cyan-100"
                    )}
                  />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </>
  );
}

function BottomNavigation({ active }: { active: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/[0.78] px-2 pt-2 shadow-medium backdrop-blur-2xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const selected = item.label === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "grid min-h-12 place-items-center gap-0.5 rounded-card px-1 text-[11px] font-black leading-tight transition",
                selected ? "bg-cyan-300 text-slate-950 shadow-glow" : "text-teal-50/75 hover:bg-white/[0.08]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
