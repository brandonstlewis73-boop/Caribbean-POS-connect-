"use client";

/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  BarChart3,
  Boxes,
  BrainCircuit,
  ChevronRight,
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
  Tags,
  UserCog,
  UsersRound,
  X,
  type LucideIcon
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import { OrderLiveAlerts } from "@/components/orders/OrderLiveAlerts";
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
      { label: "Reports", href: "/reports", icon: BarChart3 }
    ]
  },
  {
    label: "Business",
    items: [
      { label: "WhatsApp", href: "/settings#whatsapp", icon: MessageCircle },
      { label: "AI Tools", href: "/ai", icon: BrainCircuit },
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

const mobileDrawerGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Checkout",
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Checkout", href: "/pos", icon: ShoppingCart },
      { label: "Orders", href: "/orders", icon: ClipboardList },
      { label: "Receipts", href: "/receipts", icon: ReceiptText },
      { label: "Deliveries", href: "/deliveries", icon: MapPinned }
    ]
  },
  {
    label: "Back Office",
    items: [
      { label: "Products", href: "/inventory", icon: Boxes },
      { label: "Customers", href: "/customers", icon: UsersRound },
      { label: "Categories", href: "/categories", icon: Tags },
      { label: "Reports", href: "/reports", icon: BarChart3 }
    ]
  },
  {
    label: "Business",
    items: [
      { label: "WhatsApp", href: "/settings#whatsapp", icon: MessageCircle },
      { label: "AI Tools", href: "/ai", icon: BrainCircuit },
      { label: "Staff", href: "/staff", icon: UserCog },
      { label: "Subscription", href: "/subscription", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Printers", href: "/printer", icon: Printer }
    ]
  },
  {
    label: "Support",
    items: [
      { label: "Help", href: "/help", icon: LifeBuoy }
    ]
  }
];

const bottomNavItems = ["Dashboard", "POS", "Orders", "Receipts", "Settings"]
  .map((label) => navItems.find((item) => item.label === label))
  .filter((item): item is NavItem => Boolean(item));

export function AppShellClient({
  active,
  title,
  children,
  actions,
  businessId,
  businessName,
  businessLogoUrl,
  currency,
  market,
  orderAlertsEnabled,
  orderAlertSoundEnabled,
  orderBrowserNotificationsEnabled,
  orderAlertPreviewEnabled
}: {
  active: string;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  businessId?: string | null;
  businessName?: string | null;
  businessLogoUrl?: string | null;
  currency: string;
  market: string;
  orderAlertsEnabled: boolean;
  orderAlertSoundEnabled: boolean;
  orderBrowserNotificationsEnabled: boolean;
  orderAlertPreviewEnabled: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const orderCountStorageKey = useMemo(
    () => `caribbean:new-order-count:${businessId || "unknown"}`,
    [businessId]
  );

  useEffect(() => {
    let storedCount=0;
    try {storedCount=Number(window.localStorage.getItem(orderCountStorageKey)||0)} catch {/* Private browsing can disable storage. */}
    if (storedCount > 0 && active !== "Orders") setNewOrderCount(storedCount);
    function handleNewOrder() {
      setNewOrderCount((current) => {
        const next = current + 1;
        try {window.localStorage.setItem(orderCountStorageKey, String(next))} catch {/* Alerts still work without storage. */}
        return next;
      });
    }
    function clearNewOrders() {
      try {window.localStorage.removeItem(orderCountStorageKey)} catch {/* Alerts still work without storage. */}
      setNewOrderCount(0);
    }
    window.addEventListener("caribbean:new-order", handleNewOrder as EventListener);
    window.addEventListener("caribbean:orders-seen", clearNewOrders as EventListener);
    if (active === "Orders") clearNewOrders();
    return () => {
      window.removeEventListener("caribbean:new-order", handleNewOrder as EventListener);
      window.removeEventListener("caribbean:orders-seen", clearNewOrders as EventListener);
    };
  }, [active, orderCountStorageKey]);

  useEffect(() => {
    if (!menuOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();

    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      desktop.removeEventListener("change", closeOnDesktop);
      document.querySelector<HTMLButtonElement>(".app-shell-menu-button")?.focus();
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  return (
    <div className="business-shell min-h-dvh overflow-x-hidden text-caribbean-ink">
      <aside className="app-desktop-sidebar fixed inset-y-0 left-0 z-30 hidden w-sidebar overflow-y-auto border-r border-white/10 bg-[#041211]/95 px-3 py-4 shadow-soft backdrop-blur-xl md:block">
        <SidebarContent active={active} currency={currency} newOrderCount={newOrderCount} includeSecondary />
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
          "app-mobile-drawer fixed inset-y-0 left-0 z-50 w-[82vw] max-w-[320px] overflow-y-auto bg-[#354050] px-5 text-white shadow-[18px_0_70px_rgba(0,0,0,0.36)] transition-transform duration-300 ease-out md:hidden",
          menuOpen ? "translate-x-0" : "-translate-x-full shadow-none"
        )}
        aria-hidden={!menuOpen}
        inert={!menuOpen}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100/60">
            Workspace
          </span>
          <button
            type="button"
            aria-label="Close navigation"
            className="touch-target inline-grid place-items-center rounded-2xl border border-white/10 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
            onClick={() => setMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <SecondaryMenu
          active={active}
          newOrderCount={newOrderCount}
          businessName={businessName}
          businessLogoUrl={businessLogoUrl}
          onNavigate={() => setMenuOpen(false)}
        />
      </aside>

      <div className="min-w-0 md:pl-sidebar">
        <header className="app-shell-header app-safe-top sticky top-0 z-30 border-b border-white/10 bg-[#03100f]/92 px-3 pb-3 shadow-soft backdrop-blur-xl sm:px-5 lg:px-6">
          <div className="mx-auto grid min-h-[52px] w-full max-w-[1240px] min-w-0 gap-3 sm:flex sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label="Open secondary menu"
                className="app-shell-menu-button touch-target inline-grid shrink-0 place-items-center rounded-card border border-white/10 bg-white/[0.07] text-teal-50 shadow-soft transition hover:border-cyan-200/35 hover:bg-white/[0.12] md:hidden"
                onClick={() => setMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="app-shell-title-kicker text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200/65 sm:text-xs">
                  {market} / {currency}
                </p>
                <h1 className="app-shell-title min-w-0 text-xl font-black leading-tight text-white sm:text-2xl">
                  {title}
                </h1>
              </div>
            </div>

            <div className="app-shell-actions grid min-w-0 max-w-full gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
              {actions}
            </div>
          </div>
        </header>

        <main className="app-shell-main animate-fade-in app-safe-bottom-space min-w-0 max-w-full overflow-x-hidden px-3 pt-4 xs:px-4 sm:px-5 md:pb-8 lg:px-6">
          <div className="mx-auto w-full max-w-[1240px] min-w-0">{children}</div>
        </main>
      </div>

      <BottomNavigation active={active} hidden={menuOpen} newOrderCount={newOrderCount} />

      <OrderLiveAlerts
        enabled={orderAlertsEnabled}
        playSound={orderAlertSoundEnabled}
        browserNotifications={orderBrowserNotificationsEnabled}
        showPreview={orderAlertPreviewEnabled}
        currency={currency}
      />

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
  newOrderCount = 0,
  onNavigate,
  includeSecondary = false
}: {
  active: string;
  currency: string;
  newOrderCount?: number;
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
          src="/caribbean-pos-connect-icon.png"
          alt=""
          width={48}
          height={48}
          className="h-11 w-11 shrink-0 rounded-card object-contain"
        />
        <span className="min-w-0">
          <span className="block text-sm font-black leading-tight text-white">{APP_NAME}</span>
          <span className="text-xs font-bold text-cyan-200/70">Business workspace / {currency}</span>
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
                  aria-current={selected ? "page" : undefined}
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
                  {item.label === "Orders" && newOrderCount > 0 ? (
                    <span className="ml-auto grid min-h-5 min-w-5 place-items-center rounded-full bg-amber-300 px-1.5 text-[10px] font-black text-slate-950">{newOrderCount}</span>
                  ) : null}
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

function SecondaryMenu({
  active,
  newOrderCount,
  businessName,
  businessLogoUrl,
  onNavigate
}: {
  active: string;
  newOrderCount: number;
  businessName?: string | null;
  businessLogoUrl?: string | null;
  onNavigate: () => void;
}) {
  return (
    <div className="grid min-h-[calc(100dvh-5rem)] gap-5">
      <Link
        href="/dashboard"
        onClick={onNavigate}
        className="flex min-w-0 items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.08] px-3 py-3 shadow-soft"
      >
        {businessLogoUrl ? (
          <img
            src={businessLogoUrl}
            alt={`${businessName || "Business"} logo`}
            className="h-16 w-16 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1.5"
          />
        ) : (
          <Image
            src="/caribbean-pos-connect-icon.png"
            alt=""
            width={44}
            height={44}
            className="h-12 w-12 shrink-0 rounded-2xl object-contain"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black leading-tight text-white">{businessName || APP_NAME}</span>
          <span className="text-xs font-bold text-cyan-200/70">Business management</span>
        </span>
        <ChevronRight className="h-5 w-5 text-cyan-100/65" />
      </Link>
      <nav className="grid gap-5">
        {mobileDrawerGroups.map((group) => (
          <div key={group.label} className="grid gap-1">
            <p className="px-3 text-[11px] font-black uppercase tracking-[0.28em] text-white/36">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const selected =
                item.label === active ||
                (item.label === "Checkout" && active === "POS") ||
                (item.label === "Home" && active === "Dashboard") ||
                (item.label === "Products" && active === "Inventory") ||
                (item.label === "Help" && active === "Help & Support");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={selected ? "page" : undefined}
                  onClick={onNavigate}
                  className={cn(
                    "group flex min-h-12 min-w-0 items-center gap-4 rounded-2xl px-3 text-[15px] font-black transition duration-200",
                    selected
                      ? "bg-white/12 text-white"
                      : "text-white/82 hover:bg-white/[0.08] hover:text-white"
                  )}
                >
                  <Icon className={cn("h-5 w-5 shrink-0 transition", selected ? "text-teal-300" : "text-white/56 group-hover:text-teal-200")} />
                  <span className="min-w-0 truncate">{item.label}</span>
                  {item.label === "Orders" && newOrderCount > 0 ? (
                    <span className="ml-auto grid min-h-6 min-w-6 place-items-center rounded-full bg-teal-300 px-1.5 text-xs font-black text-slate-900">{newOrderCount}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="mt-auto grid gap-3">
        <Link
          href="/subscription"
          onClick={onNavigate}
          className="flex items-center justify-between gap-3 rounded-none bg-teal-300 px-4 py-4 text-base font-black text-slate-800 shadow-[0_-12px_30px_rgba(20,184,166,0.16)]"
        >
          <span>
            <span className="block">Billing & plans</span>
            <span className="block text-sm font-bold text-slate-700/80">Subscription and usage</span>
          </span>
          <ChevronRight className="h-6 w-6" />
        </Link>
        <SignOutButton />
      </div>
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

function BottomNavigation({ active, hidden, newOrderCount }: { active: string; hidden?: boolean; newOrderCount: number }) {
  return (
    <nav className={cn("safe-bottom fixed inset-x-0 bottom-0 z-40 hidden border-t border-white/10 bg-[#03100f]/95 px-2 pt-2 shadow-medium backdrop-blur-2xl transition-transform duration-200 md:hidden", hidden ? "translate-y-full" : "translate-y-0")}>
      <div className="grid grid-cols-5 gap-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const selected = item.label === active;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={selected ? "page" : undefined}
              className={cn(
                "grid min-h-12 place-items-center gap-0.5 rounded-card px-1 text-[11px] font-black leading-tight transition",
                selected ? "bg-cyan-300 text-slate-950 shadow-glow" : "text-teal-50/75 hover:bg-white/[0.08]"
              )}
            >
              <span className="relative">
                <Icon className="h-4 w-4" />
                {item.label === "Orders" && newOrderCount > 0 ? (
                  <span className="absolute -right-2 -top-2 grid min-h-4 min-w-4 place-items-center rounded-full bg-amber-300 px-1 text-[9px] font-black text-slate-950">{newOrderCount}</span>
                ) : null}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
