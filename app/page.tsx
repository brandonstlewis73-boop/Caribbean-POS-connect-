import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  MessageCircle,
  PackageCheck,
  Store,
  Wifi,
  Zap
} from "lucide-react";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { label: "Solutions", href: "#solutions", hasMenu: true },
  { label: "Segments", href: "#segments" },
  { label: "Pricing", href: "#plans" },
  { label: "Help", href: "/contact", hasMenu: true }
];

const heroHighlights = ["POS system", "inventory control", "online storefront"];

const productTiles = [
  { name: "Jerk Chicken", price: "TT$49", color: "from-orange-200 to-orange-400" },
  { name: "Coco Bread", price: "TT$12", color: "from-amber-100 to-yellow-300" },
  { name: "Tropical Juice", price: "TT$18", color: "from-cyan-100 to-teal-300" },
  { name: "Retail Item", price: "TT$60", color: "from-violet-100 to-violet-300" }
];

const quickWins = [
  { title: "Fast checkout", text: "Sell from counter or phone.", icon: Zap },
  { title: "Online storefront", text: "Let customers order anytime.", icon: Store },
  { title: "Inventory sync", text: "Track stock and low alerts.", icon: Boxes },
  { title: "WhatsApp updates", text: "Send order messages fast.", icon: MessageCircle }
];

const storySections = [
  {
    label: "Seamless selling. Anytime. Anywhere",
    title: "Seize the sale, wherever you are",
    copy:
      "Bring counter sales, online orders, products, and customer data together without the tech hassle or heavy costs.",
    points: ["Counter checkout", "Mobile catalog", "Receipt history"],
    visual: "storefront"
  },
  {
    label: "Synchronized operations",
    title: "Mobile tools for every small business team",
    copy:
      "Owners, staff, drivers, and cashiers can work from the same clean system with the right tools at the right time.",
    points: ["Staff access", "Delivery status", "Customer messages"],
    visual: "mobile"
  },
  {
    label: "Simple back office",
    title: "The basics for your operations, beautifully mastered",
    copy:
      "Products, categories, customers, receipts, reports, and settings stay organized so daily work feels lighter.",
    points: ["Products", "Reports", "Settings"],
    visual: "dashboard"
  }
];

const stats = [
  { value: "Fast", label: "checkout flow" },
  { value: "24/7", label: "online ordering" },
  { value: "Cloud", label: "sync and receipts" }
];

const plans = [
  {
    name: "Starter",
    label: "Launch",
    price: "US$29/mo",
    detail: "For new businesses that need POS, products, orders, and receipts.",
    features: ["POS", "Products", "Orders", "Receipts"],
    cta: "Start Starter"
  },
  {
    name: "Business",
    label: "Popular",
    price: "US$79/mo",
    detail: "For active teams that need storefront, staff tools, and messaging workflows.",
    features: ["Storefront", "Staff", "Messaging", "Reports"],
    cta: "Start Business",
    highlighted: true
  },
  {
    name: "Pro",
    label: "Growth",
    price: "US$149/mo",
    detail: "For growing operations that need automation, reports, AI support, and scale.",
    features: ["Automation", "Analytics", "AI Support", "Multi-location"],
    cta: "Start Pro"
  }
];

const footerGroups = [
  { title: "Sell", links: ["POS System", "Online Orders", "WhatsApp", "Receipts"] },
  { title: "Manage", links: ["Inventory", "Orders", "Customers", "Reports"] },
  { title: "Segments", links: ["Restaurants", "Retail", "Cafes", "Delivery teams"] },
  { title: APP_NAME, links: ["Pricing", "Contact", "Privacy", "Sign in"] }
];

function BrandMark({ size = "large" }: { size?: "small" | "large" }) {
  const imageSize = size === "large" ? 42 : 34;

  return (
    <span className="flex min-w-0 items-center gap-3">
      <Image
        src="/caribbean-pos-connect-icon.png"
        alt={`${APP_NAME} logo`}
        width={imageSize}
        height={imageSize}
        className="shrink-0 rounded-xl object-cover shadow-[0_8px_24px_rgba(23,169,154,0.18)]"
        priority={size === "large"}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-black text-slate-950 sm:text-base">{APP_NAME}</span>
        <span className="block truncate text-xs font-bold text-slate-500">POS for Caribbean businesses</span>
      </span>
    </span>
  );
}

function HeroShowcase() {
  return (
    <div className="kyte-showcase mx-auto mt-14 max-w-5xl">
      <div className="kyte-device-frame">
        <div className="kyte-laptop-topbar">
          <span />
          <span />
          <span />
          <p>Live checkout workspace</p>
        </div>
        <div className="kyte-device-grid">
          <div className="kyte-phone-preview">
            <div className="flex items-center justify-between text-xs font-black text-slate-500">
              <span>Checkout</span>
              <span>Cart 3</span>
            </div>
            <div className="mt-3 grid gap-2">
              {productTiles.slice(0, 3).map((item) => (
                <div key={item.name} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                  <span className={`h-10 w-10 rounded-lg bg-gradient-to-br ${item.color}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-black text-slate-800">{item.name}</span>
                    <span className="block text-[10px] font-bold text-slate-400">{item.price}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="kyte-pos-preview">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-600">Sell</p>
                <h2 className="mt-1 text-2xl font-black text-slate-950">Point of sale</h2>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-xs font-black text-teal-700">
                <Wifi className="h-4 w-4" />
                Synced
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {productTiles.map((item) => (
                <article key={item.name} className="rounded-2xl bg-white p-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <div className={`h-20 rounded-xl bg-gradient-to-br ${item.color}`} />
                  <h3 className="mt-3 truncate text-xs font-black text-slate-900">{item.name}</h3>
                  <p className="mt-1 text-xs font-bold text-teal-700">{item.price}</p>
                </article>
              ))}
            </div>
          </div>

          <aside className="kyte-cart-preview">
            <h3 className="text-sm font-black text-slate-950">Cart</h3>
            <div className="mt-4 space-y-3">
              {productTiles.slice(0, 3).map((item) => (
                <div key={item.name} className="flex justify-between gap-3 text-xs">
                  <span className="font-bold text-slate-500">{item.name}</span>
                  <span className="font-black text-slate-900">{item.price}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <div className="flex justify-between text-sm font-black text-slate-950">
                <span>Total</span>
                <span>TT$79</span>
              </div>
              <button className="mt-4 min-h-11 w-full rounded-xl bg-[#33cdb7] text-sm font-black text-white">
                Complete sale
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function HeroMediaBackdrop() {
  return (
    <div className="kyte-hero-media-backdrop" aria-hidden="true">
      <Image
        src="/storefront/premium-bakery-virtual-store.png"
        alt=""
        fill
        sizes="100vw"
        className="object-cover"
        priority
      />
    </div>
  );
}

function StoryVisual({ type }: { type: string }) {
  if (type === "storefront") {
    return (
      <div className="kyte-image-card">
        <Image
          src="/storefront/premium-bakery-virtual-store.png"
          alt="Premium Caribbean POS Connect storefront preview"
          fill
          sizes="(max-width: 768px) 100vw, 48vw"
          className="object-cover"
        />
        <div className="absolute inset-x-5 bottom-5 rounded-2xl bg-white/88 p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] backdrop-blur">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Online storefront</p>
          <p className="mt-1 text-sm font-black text-slate-950">Customers browse, order, and checkout from any device.</p>
        </div>
      </div>
    );
  }

  if (type === "mobile") {
    return (
      <div className="kyte-phone-scene">
        <div className="kyte-mobile-device">
          <div className="kyte-mobile-notch" />
          <div className="flex items-center justify-between">
            <Store className="h-5 w-5 text-teal-600" />
            <span className="rounded-full bg-teal-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-teal-700">Open</span>
          </div>
          <h3 className="mt-6 text-2xl font-black text-slate-950">Baker buds</h3>
          <p className="mt-2 text-sm font-bold text-slate-500">Online ordering - delivery ready.</p>
          <div className="mt-5 grid gap-3">
            {["New order", "Driver assigned", "Receipt sent"].map((item) => (
              <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
                <CheckCircle2 className="h-5 w-5 text-teal-600" />
                <span className="text-sm font-black text-slate-800">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kyte-dashboard-scene">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sales", value: "TT$12,540", icon: BarChart3 },
          { label: "Orders", value: "26", icon: ClipboardCheck },
          { label: "Low stock", value: "3 items", icon: PackageCheck }
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl bg-white p-4 shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
              <Icon className="h-5 w-5 text-teal-600" />
              <p className="mt-3 text-xs font-bold text-slate-400">{item.label}</p>
              <p className="mt-1 text-lg font-black text-slate-950">{item.value}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-3xl bg-slate-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
        <div className="flex items-center justify-between">
          <p className="text-sm font-black">Sales overview</p>
          <p className="text-xs font-bold text-teal-200">Live</p>
        </div>
        <div className="kyte-chart-bars mt-5">
          {[42, 66, 51, 78, 60, 88, 72].map((height, index) => (
            <span key={height + index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="kyte-home min-h-screen overflow-x-hidden bg-[#f8fbfb] text-slate-950">
      <header className="kyte-site-header sticky top-0 z-40 border-b border-slate-200/80 bg-white/94 backdrop-blur-xl">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label={`${APP_NAME} homepage`} className="min-w-0">
            <BrandMark />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-black text-slate-600 md:flex" aria-label="Landing navigation">
            {navItems.map((item) => (
              <Link key={item.label} href={item.href} className="inline-flex items-center gap-1 transition hover:text-teal-700">
                {item.label}
                {item.hasMenu && <ChevronDown className="h-4 w-4" />}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <Link
              href="/login"
              className="hidden min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 md:inline-flex"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#33cdb7] px-4 text-sm font-black text-white shadow-[0_12px_28px_rgba(51,205,183,0.28)] transition hover:-translate-y-0.5 hover:bg-[#25bda8] sm:px-6"
            >
              Subscribe
            </Link>
          </div>
        </div>
      </header>

      <section className="kyte-hero relative overflow-hidden">
        <HeroMediaBackdrop />
        <div className="kyte-soft-background" />
        <div className="mx-auto w-full max-w-7xl px-4 pb-14 pt-14 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-black leading-tight tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Helping Caribbean business champions from storefronts to smartphones
          </h1>
          <p className="mx-auto mt-6 max-w-3xl text-base font-semibold leading-7 text-slate-600 sm:text-lg">
            The sidekick for retailers, food shops, wholesalers, and service teams. Experience a{" "}
            {heroHighlights.map((item, index) => (
              <span key={item}>
                <span className="kyte-highlight">{item}</span>
                {index < heroHighlights.length - 1 ? " that connects " : " that is too useful to ignore."}
              </span>
            ))}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="kyte-cta-primary inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-sm px-6 text-sm font-black text-white sm:w-auto">
              Create your account
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#plans" className="inline-flex min-h-12 w-full max-w-xs items-center justify-center rounded-sm border border-slate-300 bg-white px-6 text-sm font-black text-slate-700 shadow-sm transition hover:border-teal-300 hover:text-teal-700 sm:w-auto">
              View pricing
            </Link>
          </div>
          <p className="mt-4 text-xs font-bold text-slate-400">Built for busy Caribbean businesses ready to sell smarter.</p>

          <HeroShowcase />
        </div>
      </section>

      <section className="kyte-basics-section px-4 py-12 sm:px-6 lg:px-8">
        <div className="kyte-basics-card mx-auto max-w-5xl overflow-hidden px-6 py-12 text-center shadow-[0_24px_80px_rgba(20,184,166,0.10)] sm:px-10">
          <div className="kyte-basics-photo" aria-hidden="true">
            <Image
              src="/storefront/premium-bakery-virtual-store.png"
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 900px"
              className="object-cover"
            />
          </div>
          <div className="relative z-10">
            <h2 className="text-3xl font-black tracking-tight text-slate-950">The basics for your operations, beautifully mastered</h2>
            <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
              Turn every space into your business place. Real-time products, orders, inventory, receipts, and storefront tools keep every sale moving.
            </p>
          </div>
        </div>
      </section>

      <section id="solutions" className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="kyte-segment-tabs mx-auto flex max-w-3xl justify-center gap-4 overflow-x-auto pb-2">
          {["Small business owners", "Wholesalers and reps", "Home entrepreneurs"].map((item) => (
            <button key={item} className="shrink-0 rounded-sm border border-slate-200 bg-white px-5 py-3 text-sm font-black text-teal-700 shadow-sm">
              {item}
            </button>
          ))}
        </div>

        <div className="mt-10 grid gap-10">
          {storySections.map((section, index) => (
            <article key={section.title} className={`kyte-story-card ${index > 0 ? "kyte-mobile-condense" : ""}`}>
              <div className="kyte-story-copy">
                <p className="text-sm font-black text-teal-700">{section.label}</p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{section.title}</h2>
                <p className="mt-5 text-base font-semibold leading-7 text-slate-600">{section.copy}</p>
                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  {section.points.map((point) => (
                    <div key={point} className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-teal-50 text-teal-700">
                        <CheckCircle2 className="h-5 w-5" />
                      </span>
                      <p className="text-sm font-black text-slate-700">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
              <StoryVisual type={section.visual} />
            </article>
          ))}
        </div>
      </section>

      <section className="kyte-mobile-shortcuts mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:hidden">
        <div className="grid gap-3">
          {quickWins.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-950">{item.title}</h3>
                  <p className="mt-1 text-sm font-bold text-slate-500">{item.text}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section id="segments" className="bg-[#33cdb7] px-4 py-10 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 text-center md:grid-cols-3">
          {stats.map((stat) => (
            <article key={stat.label}>
              <p className="text-4xl font-black">{stat.value}</p>
              <p className="mt-2 text-sm font-bold text-slate-700">{stat.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="plans" className="mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Simple plans for growing businesses</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-semibold leading-6 text-slate-600 sm:text-base">
            Start simple and upgrade when your business needs more storefront, staff, automation, and reporting power.
          </p>
        </div>

        <div className="kyte-plan-list mt-10 grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.name} className={`kyte-plan-lite ${plan.highlighted ? "highlighted" : ""}`}>
              {plan.highlighted && <span className="kyte-most-popular">Most popular</span>}
              <p className="text-sm font-black text-teal-700">{plan.label}</p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">{plan.name}</h3>
              <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{plan.price}</p>
              <p className="mt-4 min-h-16 text-sm font-semibold leading-6 text-slate-600">{plan.detail}</p>
              <ul className="mt-6 grid gap-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-sm font-black text-slate-700">
                    <CheckCircle2 className="h-5 w-5 text-[#33cdb7]" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/signup" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-sm bg-[#33cdb7] px-5 text-sm font-black text-white shadow-[0_14px_32px_rgba(51,205,183,0.2)] transition hover:bg-[#25bda8]">
                {plan.cta}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="kyte-final-cta">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-white">Ready to run your business smarter?</h2>
            <p className="mt-3 text-sm font-semibold leading-6 text-teal-50/82">
              Manage sales, orders, inventory, customers, staff, and receipts with a system that feels local and reliable.
            </p>
          </div>
          <Link href="/signup" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-sm bg-white px-6 text-sm font-black text-teal-700 shadow-lg">
            Get Started
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <BrandMark size="small" />
          {footerGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-sm font-black text-slate-950">{group.title}</h3>
              <div className="mt-4 grid gap-3">
                {group.links.map((link) => (
                  <p key={link} className="text-sm font-semibold text-slate-500">
                    {link}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </footer>
    </main>
  );
}
