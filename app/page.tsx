import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BellRing,
  Boxes,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  CreditCard,
  Globe2,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Store,
  UsersRound,
  Zap
} from "lucide-react";
import { AnimatedCounter } from "@/components/landing/AnimatedCounter";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Businesses", href: "#businesses" },
  { label: "Plans", href: "#plans" }
];

const controlStats = [
  { label: "Total Sales", value: 12540, prefix: "$", suffix: ".75" },
  { label: "Orders", value: 256 },
  { label: "Items Sold", value: 1534 }
];

const controlTasks = [
  { label: "Accept orders", icon: ClipboardCheck, tone: "text-[#48F3F8]" },
  { label: "Track inventory", icon: PackageCheck, tone: "text-emerald-200" },
  { label: "Print receipts", icon: ReceiptText, tone: "text-[#F5C451]" },
  { label: "Send WhatsApp updates", icon: MessageCircle, tone: "text-teal-200" }
];

const trustItems = [
  { title: "Cloud Based", text: "Secure & Reliable", icon: Cloud },
  { title: "WhatsApp Ready", text: "Automated Updates", icon: MessageCircle },
  { title: "Real-time Sync", text: "Always Up to Date", icon: Zap },
  { title: "Made for the Caribbean", text: "Local. Reliable. Yours.", icon: Globe2 }
];

const features = [
  {
    title: "Mobile storefront",
    text: "Customers can browse, order, and contact your business from any phone.",
    icon: Smartphone
  },
  {
    title: "Order management",
    text: "Accept, prepare, complete, or cancel orders from one simple dashboard.",
    icon: ClipboardCheck
  },
  {
    title: "Inventory tracking",
    text: "Track stock levels, low-stock alerts, and product categories.",
    icon: Boxes
  },
  {
    title: "WhatsApp updates",
    text: "Send customers order status updates like accepted, preparing, ready, and completed.",
    icon: BellRing
  },
  {
    title: "Staff tools",
    text: "Give team members access without exposing sensitive business settings.",
    icon: UsersRound
  },
  {
    title: "Plans built for small businesses",
    text: "Simple pricing that makes sense for Caribbean stores, food shops, and local services.",
    icon: CreditCard
  }
];

const businesses = [
  "Restaurants",
  "Mini marts",
  "Salons",
  "Food shops",
  "Delivery businesses",
  "Local service teams"
];

const plans = [
  {
    name: "Starter",
    detail: "For new businesses that need POS, products, orders, and receipts.",
    badge: "Launch"
  },
  {
    name: "Business",
    detail: "For active teams that need storefront, staff tools, and messaging workflows.",
    badge: "Popular"
  },
  {
    name: "Pro",
    detail: "For growing operations that need automation, reports, AI support, and scale.",
    badge: "Growth"
  }
];

export default function LandingPage() {
  return (
    <main className="landing-premium min-h-screen overflow-x-hidden bg-[#071421] text-[#F8FAFC]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#071421]">
        <div className="landing-mesh absolute inset-0" />
        <div className="landing-grid absolute inset-0" />
      </div>

      <header className="landing-nav sticky top-0 z-40 border-b border-white/10 bg-[#071421]/72 backdrop-blur-2xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label={`${APP_NAME} homepage`}>
            <Image
              src="/caribbean-pos-connect-icon.png"
              alt={`${APP_NAME} logo`}
              width={56}
              height={56}
              className="h-12 w-12 shrink-0 rounded-2xl border border-[#48F3F8]/25 bg-[#0B1D2E] object-cover shadow-[0_0_34px_rgba(72,243,248,0.2)] transition duration-300 group-hover:scale-105"
              priority
            />
            <span className="min-w-0">
              <span className="block text-sm font-black leading-tight text-white sm:text-base">Caribbean POS Connect</span>
              <span className="block text-xs font-bold text-[#A7B4C7]">POS for Caribbean businesses</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-[#A7B4C7] md:flex" aria-label="Marketing navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="landing-nav-link relative transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href="/signup"
            className="landing-button-primary inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-black text-[#031018] shadow-[0_18px_44px_rgba(18,214,223,0.24)]"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="landing-hero relative overflow-hidden">
        <div className="landing-orb landing-orb-teal" />
        <div className="landing-orb landing-orb-aqua" />
        <div className="landing-orb landing-orb-gold" />
        <div className="landing-particles" />

        <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,540px)] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
          <div className="landing-copy relative min-w-0">
            <div className="absolute -left-16 top-12 -z-10 h-56 w-56 rounded-full bg-[#12D6DF]/18 blur-[90px]" />
            <div className="landing-kicker inline-flex min-h-9 items-center gap-2 rounded-full border border-[#48F3F8]/25 bg-[#0B1D2E]/70 px-3 text-xs font-black uppercase tracking-[0.2em] text-[#48F3F8] shadow-[0_0_38px_rgba(72,243,248,0.12)] backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-[#F5C451]" />
              Professional SaaS POS
            </div>

            <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.94] tracking-tight text-white sm:text-6xl lg:text-7xl">
              <span className="hero-word">Caribbean</span>{" "}
              <span className="hero-word hero-word-delay-1 text-[#48F3F8]">POS</span>{" "}
              <span className="hero-word hero-word-delay-2">Connect</span>
            </h1>
            <p className="landing-subtitle mt-5 max-w-2xl text-xl font-black leading-8 text-[#F8FAFC] sm:text-2xl">
              Run your store, orders, inventory, deliveries, and receipts from one simple POS.
            </p>
            <p className="landing-body mt-5 max-w-2xl text-base font-semibold leading-7 text-[#A7B4C7] sm:text-lg">
              Built for Caribbean businesses with a clean dashboard, mobile storefront, WhatsApp-ready workflows, inventory control, and staff tools.
            </p>

            <div className="landing-actions relative mt-8 flex flex-col gap-3 sm:flex-row">
              <div className="absolute -left-10 -top-8 -z-10 h-28 w-56 rounded-full bg-[#F5C451]/14 blur-[56px]" />
              <Link href="/signup" className="landing-button-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-[#031018]">
                Get Started
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#plans" className="landing-button-glass inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white">
                View Plans
              </a>
              <Link href="/login" className="landing-button-gold inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white">
                Open Demo
              </Link>
            </div>

            <div className="landing-proof mt-9 grid gap-4 text-sm font-bold text-[#A7B4C7] sm:grid-cols-3">
              {[
                "Fast checkout",
                "Online storefront",
                "Receipts & delivery"
              ].map((item, index) => (
                <p key={item} className="reveal-up flex items-center gap-2" style={{ animationDelay: `${560 + index * 90}ms` }}>
                  <CheckCircle2 className="h-4 w-4 text-[#48F3F8]" />
                  {item}
                </p>
              ))}
            </div>
          </div>

          <aside className="landing-preview relative min-w-0" aria-label="Live operations dashboard preview">
            <div className="absolute -inset-6 rounded-[40px] bg-[#12D6DF]/12 blur-3xl" />
            <div className="landing-dashboard-card relative overflow-hidden rounded-[32px] border border-[#48F3F8]/25 bg-[rgba(11,29,46,0.72)] p-4 shadow-[0_40px_120px_rgba(0,0,0,0.54)] backdrop-blur-2xl sm:p-5">
              <div className="landing-glass-shine" />
              <div className="relative flex items-start justify-between gap-4 border-b border-white/10 pb-5">
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#48F3F8]/80">Live operations</p>
                  <h2 className="mt-2 text-2xl font-black leading-tight text-white">Business control panel</h2>
                </div>
                <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/12 px-3 text-xs font-black text-emerald-100">
                  <span className="live-pulse h-2.5 w-2.5 rounded-full bg-emerald-300" />
                  Live
                </span>
              </div>

              <div className="relative mt-6 grid gap-4 sm:grid-cols-3">
                {controlStats.map((stat, index) => (
                  <div key={stat.label} className="stat-card reveal-up rounded-3xl border border-[#48F3F8]/14 bg-[#0B1D2E]/82 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.24)]" style={{ animationDelay: `${420 + index * 120}ms` }}>
                    <p className="text-xs font-bold text-[#A7B4C7]">{stat.label}</p>
                    <p className="mt-2 text-xl font-black text-white">
                      <AnimatedCounter value={stat.value} prefix={stat.prefix} suffix={stat.suffix} duration={1300 + index * 120} />
                    </p>
                  </div>
                ))}
              </div>

              <div className="relative mt-6 grid gap-4">
                {controlTasks.map((task, index) => {
                  const Icon = task.icon;
                  return (
                    <div key={task.label} className="action-row reveal-up flex items-center justify-between gap-4 rounded-3xl border border-[#48F3F8]/12 bg-slate-950/55 px-5 py-4" style={{ animationDelay: `${650 + index * 90}ms` }}>
                      <span className="flex min-w-0 items-center gap-3 text-sm font-black text-[#F8FAFC]">
                        <Icon className={`h-5 w-5 ${task.tone}`} />
                        {task.label}
                      </span>
                      <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                    </div>
                  );
                })}
              </div>

              <div className="relative mt-5 rounded-2xl border border-[#F5C451]/22 bg-[#F5C451]/10 p-4">
                <p className="flex items-center gap-2 text-sm font-black text-[#FFD978]">
                  <BadgeCheck className="h-5 w-5" />
                  Built for busy Caribbean teams
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[#A7B4C7]">
                  Keep counter sales, online orders, delivery updates, inventory, and receipts in one clean workspace.
                </p>
              </div>
            </div>
          </aside>
        </div>
        <div className="landing-wave" />
      </section>

      <section className="border-y border-[#48F3F8]/10 bg-[#0B1D2E]/52">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trustItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="reveal-on-scroll feature-strip-card flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-[#0B1D2E]/58 p-4 backdrop-blur-xl" style={{ animationDelay: `${index * 80}ms` }}>
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#12D6DF]/10 text-[#48F3F8]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-xs font-bold text-[#A7B4C7]">{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="reveal-on-scroll mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#48F3F8]">Features</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Everything your business needs in one POS</h2>
          <p className="mt-4 text-base font-semibold leading-7 text-[#A7B4C7]">
            A polished operating system for Caribbean restaurants, mini marts, salons, delivery teams, food shops, and local services.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="reveal-on-scroll premium-card group h-full rounded-3xl border border-[#48F3F8]/16 bg-[#0B1D2E]/88 p-6 shadow-[0_22px_70px_rgba(0,0,0,0.28)]" style={{ animationDelay: `${index * 80}ms` }}>
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-[#48F3F8]/18 bg-slate-950/44 text-[#48F3F8] transition group-hover:scale-105 group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#A7B4C7]">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="businesses" className="border-y border-[#48F3F8]/10 bg-[#06101C]/74">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:px-8">
          <div className="reveal-on-scroll">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-[#FFD978]">Businesses</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Built for real Caribbean operators</h2>
            <p className="mt-4 text-base font-semibold leading-7 text-[#A7B4C7]">
              Manage sales, orders, products, customers, staff, and receipts with a system that feels local, reliable, and ready to grow.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {businesses.map((business, index) => (
              <div key={business} className="reveal-on-scroll premium-row flex items-center gap-4 rounded-3xl border border-[#48F3F8]/14 bg-[#0B1D2E]/84 px-5 py-4 text-sm font-black text-[#F8FAFC]" style={{ animationDelay: `${index * 70}ms` }}>
                <Store className="h-5 w-5 text-[#F5C451]" />
                {business}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="reveal-on-scroll mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-[#48F3F8]">Plans</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">Simple plans for growing businesses</h2>
          <p className="mt-4 text-base font-semibold leading-7 text-[#A7B4C7]">
            Choose a starting point and upgrade when your business needs more staff, products, automations, and support.
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan, index) => (
            <article key={plan.name} className="reveal-on-scroll premium-card flex h-full min-h-[260px] flex-col rounded-3xl border border-[#48F3F8]/16 bg-[#0B1D2E]/88 p-7 shadow-[0_24px_80px_rgba(0,0,0,0.30)]" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-[#48F3F8]">{plan.badge}</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-200" />
              </div>
              <p className="mt-5 min-h-16 text-sm font-semibold leading-6 text-[#A7B4C7]">{plan.detail}</p>
              <Link href="/signup" className="landing-button-glass mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 text-sm font-black text-white">
                Start {plan.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="reveal-on-scroll overflow-hidden rounded-[32px] border border-[#48F3F8]/20 bg-gradient-to-br from-[#12D6DF] via-[#48F3F8] to-[#F5C451] p-px shadow-[0_32px_110px_rgba(18,214,223,0.2)]">
          <div className="rounded-[31px] bg-[#071421]/94 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">Ready to run your business smarter?</h2>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-[#A7B4C7]">
                  Start managing orders, inventory, receipts, and customer updates from one clean POS.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link href="/signup" className="landing-button-primary inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-black text-[#031018]">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link href="/login" className="landing-button-gold inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-black text-white">
                  Open Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-[#48F3F8]/10 px-4 py-8 text-center text-sm font-semibold text-[#A7B4C7]">
        {APP_NAME} - POS for Caribbean businesses.
      </footer>
    </main>
  );
}
