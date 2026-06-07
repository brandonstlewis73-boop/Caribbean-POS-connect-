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
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { label: "Features", href: "#features" },
  { label: "Businesses", href: "#businesses" },
  { label: "Plans", href: "#plans" }
];

const controlStats = [
  { label: "Today’s Sales", value: "$12,540.75" },
  { label: "Orders", value: "256" },
  { label: "Items in Stock", value: "1,534" }
];

const controlTasks = [
  "Accept orders",
  "Track inventory",
  "Print receipts",
  "Send WhatsApp updates"
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
    <main className="min-h-screen overflow-x-hidden bg-[#020807] text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_80%_16%,rgba(245,158,11,0.12),transparent_28%),linear-gradient(180deg,#03100f_0%,#061816_48%,#020807_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.028)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.024)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#020807]/82 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3" aria-label={`${APP_NAME} homepage`}>
            <Image
              src="/logo.svg"
              alt={`${APP_NAME} logo`}
              width={48}
              height={48}
              className="h-11 w-11 shrink-0 rounded-2xl border border-white/10 bg-white object-contain p-1.5 shadow-soft"
              priority
            />
            <span className="min-w-0">
              <span className="block text-sm font-black leading-tight text-white sm:text-base">Caribbean Connect POS</span>
              <span className="block text-xs font-bold text-cyan-100/68">POS for Caribbean businesses</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-bold text-teal-50/72 md:flex" aria-label="Marketing navigation">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="transition hover:text-white">
                {item.label}
              </a>
            ))}
          </nav>

          <Link
            href="/signup"
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-[0_18px_44px_rgba(34,211,238,0.18)] transition hover:bg-cyan-200"
          >
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-7xl gap-10 px-4 pb-16 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,1fr)_minmax(360px,520px)] lg:items-center lg:px-8 lg:pb-24 lg:pt-20">
        <div className="min-w-0">
          <div className="inline-flex min-h-9 items-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-200/8 px-3 text-xs font-black uppercase tracking-[0.2em] text-cyan-100">
            <Sparkles className="h-4 w-4 text-amber-200" />
            Professional SaaS POS
          </div>

          <h1 className="mt-6 max-w-4xl text-5xl font-black leading-[0.96] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Caribbean Connect POS
          </h1>
          <p className="mt-5 max-w-2xl text-xl font-black leading-8 text-cyan-50 sm:text-2xl">
            Run your store, orders, inventory, deliveries, and receipts from one simple POS.
          </p>
          <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-teal-50/70 sm:text-lg">
            Built for Caribbean businesses with a clean dashboard, mobile storefront, WhatsApp-ready workflows, inventory control, and staff tools.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-300 to-cyan-300 px-6 text-sm font-black text-slate-950 shadow-[0_22px_54px_rgba(20,184,166,0.22)] transition hover:brightness-110"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#plans"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.07] px-6 text-sm font-black text-white shadow-soft transition hover:bg-white/[0.12]"
            >
              View Plans
            </a>
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-black text-teal-50/82 transition hover:bg-white/[0.08] hover:text-white"
            >
              Open Demo
            </Link>
          </div>

          <div className="mt-9 grid gap-3 text-sm font-bold text-teal-50/72 sm:grid-cols-3">
            {["Fast checkout", "Online storefront", "Receipts & delivery"].map((item) => (
              <p key={item} className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <aside className="relative min-w-0" aria-label="Business control panel preview">
          <div className="absolute -inset-4 rounded-[32px] bg-cyan-300/8 blur-2xl" />
          <div className="relative overflow-hidden rounded-[30px] border border-white/12 bg-white/[0.075] p-4 shadow-[0_34px_110px_rgba(0,0,0,0.5)] backdrop-blur-2xl sm:p-5">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/72">Business control panel</p>
                <h2 className="mt-2 text-2xl font-black leading-tight text-white">Live operations</h2>
              </div>
              <span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-emerald-200/20 bg-emerald-300/12 px-3 text-xs font-black text-emerald-100">
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                Live
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {controlStats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-black/28 p-4">
                  <p className="text-xs font-bold text-teal-50/56">{stat.label}</p>
                  <p className="mt-2 text-xl font-black text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-3">
              {controlTasks.map((task, index) => (
                <div key={task} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/42 px-4 py-3">
                  <span className="flex min-w-0 items-center gap-3 text-sm font-black text-teal-50">
                    {index === 0 ? <ClipboardCheck className="h-5 w-5 text-cyan-200" /> : null}
                    {index === 1 ? <PackageCheck className="h-5 w-5 text-emerald-200" /> : null}
                    {index === 2 ? <ReceiptText className="h-5 w-5 text-amber-200" /> : null}
                    {index === 3 ? <MessageCircle className="h-5 w-5 text-teal-200" /> : null}
                    {task}
                  </span>
                  <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200/16 bg-amber-200/8 p-4">
              <p className="flex items-center gap-2 text-sm font-black text-amber-100">
                <BadgeCheck className="h-5 w-5" />
                Built for busy Caribbean teams
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-teal-50/68">
                Keep counter sales, online orders, delivery updates, inventory, and receipts in one clean workspace.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section className="border-y border-white/10 bg-white/[0.035]">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/8 bg-black/20 p-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-100">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-white">{item.title}</h2>
                  <p className="mt-1 text-xs font-bold text-teal-50/62">{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/68">Features</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Everything your business needs in one POS
          </h2>
          <p className="mt-4 text-base font-semibold leading-7 text-teal-50/66">
            A polished operating system for Caribbean restaurants, mini marts, salons, delivery teams, food shops, and local services.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <article key={feature.title} className="group rounded-[26px] border border-white/10 bg-white/[0.055] p-5 shadow-soft backdrop-blur-xl transition hover:border-cyan-200/24 hover:bg-white/[0.075]">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-slate-950/44 text-cyan-100">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-5 text-lg font-black text-white">{feature.title}</h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-teal-50/66">{feature.text}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section id="businesses" className="border-y border-white/10 bg-black/22">
        <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:px-8">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em] text-amber-100/72">Businesses</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
              Built for real Caribbean operators
            </h2>
            <p className="mt-4 text-base font-semibold leading-7 text-teal-50/66">
              Manage sales, orders, products, customers, staff, and receipts with a system that feels local, reliable, and ready to grow.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {businesses.map((business) => (
              <div key={business} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-4 py-4 text-sm font-black text-teal-50">
                <Store className="h-5 w-5 text-amber-200" />
                {business}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-100/68">Plans</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Simple plans for growing businesses
          </h2>
          <p className="mt-4 text-base font-semibold leading-7 text-teal-50/66">
            Choose a starting point and upgrade when your business needs more staff, products, automations, and support.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className="rounded-[28px] border border-white/10 bg-white/[0.055] p-6 shadow-soft backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-cyan-100">{plan.badge}</p>
                  <h3 className="mt-2 text-2xl font-black text-white">{plan.name}</h3>
                </div>
                <ShieldCheck className="h-6 w-6 text-emerald-200" />
              </div>
              <p className="mt-5 min-h-16 text-sm font-semibold leading-6 text-teal-50/66">{plan.detail}</p>
              <Link
                href="/signup"
                className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-4 text-sm font-black text-white transition hover:bg-cyan-300 hover:text-slate-950"
              >
                Start {plan.name}
                <ChevronRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="overflow-hidden rounded-[32px] border border-white/10 bg-gradient-to-br from-cyan-300 via-teal-300 to-amber-200 p-1 shadow-[0_32px_110px_rgba(20,184,166,0.22)]">
          <div className="rounded-[28px] bg-slate-950/92 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
                  Ready to run your business smarter?
                </h2>
                <p className="mt-4 max-w-3xl text-base font-semibold leading-7 text-teal-50/72">
                  Start managing orders, inventory, receipts, and customer updates from one clean POS.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
                <Link
                  href="/signup"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-cyan-300 px-6 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
                >
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/10 px-6 text-sm font-black text-white transition hover:bg-white/[0.08]"
                >
                  Open Demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-sm font-semibold text-teal-50/55">
        {APP_NAME} — POS for Caribbean businesses.
      </footer>
    </main>
  );
}
