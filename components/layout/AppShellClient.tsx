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
  LogOut,
  MapPinned,
  Menu,
  MessageCircle,
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
    label: "Main",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "POS", href: "/pos", icon: ShoppingCart },
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Receipts", href: "/receipts", icon: ReceiptText },
      { label: "Deliveries", href: "/deliveries", icon: MapPinned },
      { label: "Printers", href: "/printer", icon: Printer },
      { label: "Settings", href: "/settings", icon: Settings }
    ]
  }
];

const secondaryGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Back Office",
    items: [
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Categories", href: "/categories", icon: Tags },
      { label: "Inventory", href: "/inventory", icon: Boxes },
      { label: "Storefront", href: "/online", icon: Store },
      { label: "Reports", href: "/reports", icon: BarChart3 }
    ]
  },
  {
    label: "Business",
    items: [
      { label: "WhatsApp", href: "/settings#whatsapp", icon: MessageCircle },
      { label: "Staff", href: "/staff", icon: UserCog },
      { label: "Subscription", href: "/subscription", icon: CreditCard }
    ]
  },
  {
    label: "Support",
    items: [
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-sidebar overflow-y-auto border-r border-white/10 bg-[#041211]/95 px-3 py-4 shadow-soft backdrop-blur-xl md:block">
        <SidebarContent active={active} currency={currency} includeSecondary />
      </aside>

      {menuOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "glass-panel-strong fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[260px] overflow-y-auto px-4 py-5 transition-transform duration-300 ease-out md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!menuOpen}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/60">
            More
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
        <SecondaryMenu active={active} onNavigate={() => setMenuOpen(false)} />
      </aside>

      <div className="min-w-0 md:pl-sidebar">
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#03100f]/88 px-3 py-3 shadow-soft backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="mx-auto grid min-h-[52px] w-full max-w-[1240px] min-w-0 gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open secondary menu"
                className="touch-target inline-grid shrink-0 place-items-center rounded-card border border-white/10 bg-white/[0.07] text-teal-50 shadow-soft transition hover:border-cyan-200/35 hover:bg-white/[0.12] md:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-xs">
                  {market} / {currency}
                </p>
                <h1 className="min-w-0 text-xl font-black leading-tight text-white sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            <div className="grid min-w-0 max-w-full gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              <Link
                href="/online"
                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 py-2 text-center text-sm font-black leading-tight text-teal-50 shadow-soft transition hover:border-cyan-200/35 hover:bg-white/[0.12] sm:w-auto"
              >
                <Store className="h-4 w-4 shrink-0" />
                <span>Storefront</span>
              </Link>
              {actions}
            </div>
          </div>
        </header>

        <main className="animate-fade-in min-w-0 max-w-full overflow-x-hidden px-3 pb-[calc(var(--bottom-nav-height)+2rem)] pt-4 xs:px-4 sm:px-5 md:pb-8 lg:px-6">
          <div className="mx-auto w-full max-w-[1240px] min-w-0">{children}</div>
        </main>
      </div>

      <BottomNavigation active={active} />

      <Link
        href="/help"
        className={cn(
          "fixed bottom-5 right-5 z-40 hidden min-h-11 items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm font-black shadow-glow backdrop-blur-2xl transition hover:-translate-y-0.5 md:inline-flex",
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
  onNavigate,
  includeSecondary = false
}: {
  active: string;
  currency: string;
  onNavigate?: () => void;
  includeSecondary?: boolean;
}) {
  return (
    <>
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="mb-5 flex min-w-0 items-center gap-3 rounded-card border border-white/10 bg-white/[0.06] px-3 py-3 shadow-soft transition hover:border-cyan-200/30"
      >
        <Image
          src="/logo.svg"
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 shrink-0 rounded-card object-contain"
        />
        <span className="min-w-0">
          <span className="block text-sm font-black leading-tight text-white">{APP_NAME}</span>
          <span className="text-xs font-bold text-cyan-200/70">Live POS / {currency}</span>
        </span>
      </Link>

      <nav className="grid gap-5">
        {[...navGroups, ...(includeSecondary ? secondaryGroups : [])].map((group) => (
          <div key={group.label} className="grid gap-1">
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.18em] text-teal-100/45">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const selected = item.label === active || (item.label === "Printers" && active === "Printer");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex min-h-10 min-w-0 items-center gap-2.5 rounded-card px-3 text-sm font-black transition duration-200",
                    selected
                      ? "bg-cyan-300 text-slate-950 shadow-glow"
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
      {includeSecondary ? <SignOutButton /> : null}
    </>
  );
}

function SecondaryMenu({ active, onNavigate }: { active: string; onNavigate: () => void }) {
  return (
    <div className="grid gap-5">
      <div className="flex min-w-0 items-center gap-3 rounded-card border border-white/10 bg-white/[0.06] px-3 py-3 shadow-soft">
        <Image
          src="/logo.svg"
          alt=""
          width={44}
          height={44}
          className="h-11 w-11 shrink-0 rounded-card object-contain"
        />
        <span className="min-w-0">
          <span className="block text-sm font-black leading-tight text-white">{APP_NAME}</span>
          <span className="text-xs font-bold text-cyan-200/70">Account menu</span>
        </span>
      </div>
      <nav className="grid gap-5">
        {secondaryGroups.map((group) => (
          <div key={group.label} className="grid gap-1">
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
                      ? "bg-cyan-300 text-slate-950 shadow-glow"
                      : "text-teal-50/75 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0 transition", selected ? "text-slate-950" : "text-cyan-100/70 group-hover:text-cyan-100")} />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <SignOutButton />
    </div>
  );
}

function SignOutButton() {
  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="mt-5 flex min-h-10 w-full min-w-0 items-center gap-2.5 rounded-card border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-teal-50/75 transition hover:bg-red-400/12 hover:text-red-100"
    >
      <LogOut className="h-4 w-4 text-cyan-100/70" />
      <span>Sign out</span>
    </button>
  );
}

function BottomNavigation({ active }: { active: string }) {
  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/[0.78] px-2 pt-2 shadow-medium backdrop-blur-2xl md:hidden">
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
