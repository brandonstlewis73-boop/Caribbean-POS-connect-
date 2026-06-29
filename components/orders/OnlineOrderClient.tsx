"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Bell, CheckCircle2, Headphones, Home, LocateFixed, Lock, Minus, Package, Plus, Search, ShieldCheck, ShoppingBag, Store, Trash2, Truck, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { getDefaultCountryForCurrency, getDeliveryRegionsForCurrency, money, PAYMENT_METHODS } from "@/lib/constants";
import { publicStoreName } from "@/lib/storefront-identity";
import { readApiPayload } from "@/lib/client-response";
import { detectCurrentAddress } from "@/lib/location-client";
import type { OnlineMarket } from "@/lib/online-market";
import type { Category, Order, Product, Settings } from "@/lib/types";

type CartItem = Product & { quantity: number };
const VirtualStorefront = dynamic(() => import("@/components/storefront/VirtualStorefrontClient"), {
  ssr: false,
  loading: () => (
    <section className="grid min-h-[420px] place-items-center rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-center text-white shadow-2xl">
      <div>
        <div className="mx-auto h-14 w-14 animate-pulse rounded-3xl bg-cyan-300/20" />
        <p className="mt-4 text-lg font-black">Loading 3D storefront...</p>
        <p className="mt-2 text-sm font-semibold text-cyan-50/60">The normal storefront and checkout remain available.</p>
      </div>
    </section>
  )
});

function emptyCustomer(currency: string) {
  const regions = getDeliveryRegionsForCurrency(currency);
  return {
    name: "",
    phone: "",
    email: "",
    street_address: "",
    city: "",
    region: regions[0] || "",
    country: getDefaultCountryForCurrency(currency),
    postal_code: "",
    delivery_notes: "",
    marketing_consent: false
  };
}


function paymentMethodEnabled(method: string, settings: Settings) {
  if (method === "Cash") return settings.payment_cash_enabled;
  if (method === "Card") return settings.payment_card_enabled;
  if (method === "Transfer" || method === "Bank transfer") return settings.payment_bank_enabled;
  if (method === "Digital Wallet") return settings.payment_wipay_enabled;
  if (method === "Split Payment") return true;
  if (method === "PayPal") return settings.payment_paypal_enabled;
  if (method === "WiPay") return settings.payment_wipay_enabled;
  if (method === "Pay on delivery") return settings.payment_pod_enabled;
  return true;
}

function StoreField({ label, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <input
        className={`min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${className || ""}`}
        {...props}
      />
    </label>
  );
}

function StoreSelect({ label, children, className, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <select
        className={`min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-950 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${className || ""}`}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}

export function OnlineOrderClient({
  products: initialProducts,
  categories: initialCategories = [],
  settings: initialSettings,
  market: initialMarket = null,
  initialStatusMessage = "",
  menuEndpoint = "/api/online",
  orderEndpoint = "/api/orders",
  businessId = null,
  storefrontSlug = null
}: {
  products: Product[];
  categories?: Category[];
  settings: Settings;
  market?: OnlineMarket | null;
  initialStatusMessage?: string;
  menuEndpoint?: string;
  orderEndpoint?: string;
  businessId?: string | null;
  storefrontSlug?: string | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [categories, setCategories] = useState(initialCategories);
  const [settings, setSettings] = useState(initialSettings);
  const [market, setMarket] = useState<OnlineMarket | null>(initialMarket);
  const [category, setCategory] = useState("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">(
    initialSettings.delivery_enabled === false && initialSettings.pickup_enabled !== false ? "pickup" : "delivery"
  );
  const [customer, setCustomer] = useState(() => emptyCustomer(initialSettings.currency));
  const [paymentMethod, setPaymentMethod] = useState("Pay on delivery");
  const [coords, setCoords] = useState({ latitude: "", longitude: "" });
  const [locationLink, setLocationLink] = useState("");
  const [locationStatus, setLocationStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState(initialStatusMessage);
  const [loading, setLoading] = useState(false);
  const [showVirtualStore, setShowVirtualStore] = useState(Boolean(initialSettings.storefront_3d_enabled));
  const [mobileCheckoutOpen, setMobileCheckoutOpen] = useState(false);
  const displaySettings = useMemo(() => ({ ...settings, business_name: publicStoreName(settings.business_name, storefrontSlug) }), [settings, storefrontSlug]);

  useEffect(() => {
    let cancelled = false;
    async function loadOnlineMenu() {
      try {
        const separator = menuEndpoint.includes("?") ? "&" : "?";
        const response = await fetch(`${menuEndpoint}${window.location.search ? `${separator}${window.location.search.slice(1)}` : ""}`, { cache: "no-store" });
        const payload = await readApiPayload<{
          products: Product[];
          categories?: Category[];
          settings: Settings;
          market?: OnlineMarket;
          statusMessage?: string | null;
        }>(response);
        if (cancelled) return;
        if (!response.ok) {
          setStatusMessage(payload.error || "Online menu is temporarily unavailable.");
          return;
        }
        setProducts(payload.data?.products || []);
        setCategories(payload.data?.categories || []);
        setSettings(payload.data?.settings || initialSettings);
        setMarket(payload.data?.market || null);
        setStatusMessage(payload.data?.statusMessage || "");
      } catch {
        if (!cancelled) setStatusMessage("Online menu is temporarily unavailable.");
      }
    }
    loadOnlineMenu();
    return () => {
      cancelled = true;
    };
  }, [initialSettings, menuEndpoint]);

  const threeDStorefrontEnabled = Boolean(settings.storefront_3d_enabled);
  useEffect(() => {
    if (!threeDStorefrontEnabled || typeof window === "undefined") return;
    const view = new URLSearchParams(window.location.search).get("view");
    if (view === "3d" || view === "3d-preview") setShowVirtualStore(true);
  }, [threeDStorefrontEnabled]);
  const storefrontCategories = useMemo(() => {
    if (settings.show_empty_categories) return categories;
    return categories.filter((item) =>
      products.some((product) => product.category_id === item.id || product.category === item.name)
    );
  }, [categories, products, settings.show_empty_categories]);

  const visibleProducts = useMemo(
    () => {
      const selectedCategory = storefrontCategories.find((item) => item.id === category);
      return products.filter(
        (product) =>
          category === "all" ||
          product.category_id === category ||
          (selectedCategory ? product.category === selectedCategory.name : false)
      );
    },
    [products, category, storefrontCategories]
  );
  const enabledPaymentMethods = PAYMENT_METHODS.filter((method) => paymentMethodEnabled(method, settings));
  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const tax = settings.tax_enabled ? subtotal * (settings.tax_rate / 100) : 0;
  const deliveryFee =
    fulfillment === "delivery"
      ? settings.free_delivery_minimum && subtotal >= settings.free_delivery_minimum
        ? 0
        : Number((settings.delivery_rates || {})[customer.region] ?? settings.delivery_fee ?? 0)
      : 0;
  const total = subtotal + tax + deliveryFee;
  const formatMoney = (value: number | string | null | undefined) => money(value, settings.currency);
  const deliveryRegions = getDeliveryRegionsForCurrency(settings.currency);
  const defaultDeliveryRegion = deliveryRegions[0] || "";
  const defaultCountry = getDefaultCountryForCurrency(settings.currency);
  const initialCountry = getDefaultCountryForCurrency(initialSettings.currency);
  const marketCountry = market?.country || defaultCountry;
  const deliveryRegionLabel = settings.currency === "USD" ? "State / territory" : "Delivery region";

  useEffect(() => {
    setCustomer((current) => {
      const nextRegion = deliveryRegions.includes(current.region) ? current.region : defaultDeliveryRegion;
      const nextCountry = current.country && current.country !== initialCountry ? current.country : marketCountry;
      if (nextRegion === current.region && nextCountry === current.country) return current;
      return { ...current, region: nextRegion, country: nextCountry };
    });
  }, [defaultDeliveryRegion, deliveryRegions, initialCountry, marketCountry]);

  useEffect(() => {
    if (settings.delivery_enabled === false && fulfillment === "delivery") {
      setFulfillment(settings.pickup_enabled === false ? "delivery" : "pickup");
    }
    if (settings.pickup_enabled === false && fulfillment === "pickup") {
      setFulfillment(settings.delivery_enabled === false ? "pickup" : "delivery");
    }
  }, [fulfillment, settings.delivery_enabled, settings.pickup_enabled]);

  function add(product: Product) {
    if (order) return;
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      return existing
        ? current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item))
        : [...current, { ...product, quantity: 1 }];
    });
  }

  function update(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  async function captureLocation() {
    setError("");
    setLocationStatus("Finding your location...");
    setLocating(true);
    try {
      const { address } = await detectCurrentAddress();
      setCoords({
        latitude: String(address.lat),
        longitude: String(address.lng)
      });
      setLocationLink(`https://maps.google.com/?q=${address.lat},${address.lng}`);
      setCustomer((current) => ({
        ...current,
        street_address: address.street || address.formatted || current.street_address,
        city: address.city || current.city,
        region: address.region || current.region,
        country: address.country || current.country,
        postal_code: address.postalCode || current.postal_code
      }));
      setLocationStatus("Address added. Please check it before submitting.");
    } catch (err) {
      setLocationStatus("");
      setError(err instanceof Error ? err.message : "Unable to capture GPS location. You can still enter your address manually.");
    } finally {
      setLocating(false);
    }
  }

  async function submitOrder() {
    if (loading || order) return;
    setError("");
    if (settings.storefront_status === "paused") return setError("This storefront is paused right now. Please contact the business.");
    if (settings.delivery_enabled === false && settings.pickup_enabled === false) {
      return setError("Ordering is currently unavailable for this storefront.");
    }
    if (fulfillment === "delivery" && settings.delivery_enabled === false) return setError("Delivery is not available right now.");
    if (fulfillment === "pickup" && settings.pickup_enabled === false) return setError("Pickup is not available right now.");
    if (!cart.length) return setError("Please add at least one product.");
    if (!customer.name || !customer.phone) return setError("Name and phone number are required.");
    if (fulfillment === "delivery" && !customer.street_address) return setError("Delivery address is required.");
    setLoading(true);
    try {
      const response = await fetch(orderEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          storefront_slug: storefrontSlug,
          items: cart.map((item) => ({ product_id: item.id, quantity: item.quantity })),
          customer: { ...customer, preferred_payment_method: paymentMethod },
          order_type: fulfillment,
          payment_method: paymentMethod,
          payment_status: paymentMethod === "Pay on delivery" ? "unpaid" : "paid",
          delivery_fee: deliveryFee,
          delivery:
            fulfillment === "delivery"
              ? {
                  street_address: customer.street_address,
                  city: customer.city,
                  region: customer.region,
                  country: customer.country,
                  postal_code: customer.postal_code,
                  notes: customer.delivery_notes,
                  latitude: coords.latitude ? Number(coords.latitude) : undefined,
                  longitude: coords.longitude ? Number(coords.longitude) : undefined,
                  location_link: locationLink || undefined
                }
              : undefined
        })
      });
      const payload = await readApiPayload<{ order: Order }>(response);
      if (!response.ok) return setError(payload.error || "Order could not be submitted.");
      if (!payload.data?.order) return setError("Order was submitted, but no order details were returned.");
      setOrder(payload.data.order);
      setCart([]);
      setMobileCheckoutOpen(false);
    } catch {
      setError("Order could not be submitted. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(18,214,223,0.12),transparent_32%),linear-gradient(180deg,#f8fffe_0%,#eef7f5_44%,#f7faf8_100%)] pb-24 text-slate-950 xl:pb-0">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-24 flex-col items-center justify-between bg-[#06172a] px-3 py-6 text-white shadow-2xl xl:flex">
        <div className="grid gap-8">
          <img src="/caribbean-pos-connect-icon.png" alt="Caribbean POS Connect" className="mx-auto h-14 w-14 rounded-2xl object-contain shadow-lg" />
          <nav className="grid gap-3" aria-label="Storefront sections">
            <a href="#storefront" className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-400/18 text-cyan-100 shadow-lg shadow-cyan-950/30" aria-label="Storefront"><Home className="h-5 w-5" /></a>
            <a href="#products" className="grid h-12 w-12 place-items-center rounded-2xl text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Products"><Package className="h-5 w-5" /></a>
            <a href="#checkout" className="grid h-12 w-12 place-items-center rounded-2xl text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Cart"><ShoppingBag className="h-5 w-5" /></a>
            <a href="/contact" className="grid h-12 w-12 place-items-center rounded-2xl text-slate-300 transition hover:bg-white/10 hover:text-white" aria-label="Support"><Headphones className="h-5 w-5" /></a>
          </nav>
        </div>
        <div className="grid gap-3 rounded-3xl border border-white/10 bg-white/8 p-3 text-center">
          <img src={displaySettings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-10 w-10 rounded-2xl bg-white object-contain p-1" />
          <span className="h-2 w-2 place-self-center rounded-full bg-emerald-400" />
        </div>
      </aside>
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/94 px-4 py-3 shadow-sm backdrop-blur-xl xl:pl-28">
        <div className="mx-auto flex max-w-[1620px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="hidden text-base font-black tracking-tight text-blue-700 sm:inline">Caribbean <span className="text-slate-900">POS Connect</span></span>
            <div className="h-6 w-px bg-slate-200 max-sm:hidden" />
            <img src={displaySettings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-11 w-11 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm" />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black leading-tight tracking-tight text-slate-950 sm:text-xl">{displaySettings.business_name}</h1>
              <p className="truncate text-xs font-semibold text-slate-500 sm:text-sm">Online ordering - {marketCountry} / {settings.currency}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <label className="relative hidden min-w-64 max-w-xs flex-1 lg:block">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-semibold text-slate-700 outline-none transition focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100" placeholder="Search products..." readOnly />
            </label>
            <button type="button" className="hidden h-11 w-11 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm sm:grid" aria-label="Notifications"><Bell className="h-4 w-4" /></button>
            {!order ? (
              <a href="#checkout" className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-black text-teal-800 shadow-sm">
                Cart {cart.length} - {formatMoney(total)}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div id="storefront" className="mx-auto grid max-w-[1720px] min-w-0 gap-7 px-4 py-6 lg:gap-9 xl:grid-cols-[minmax(0,1fr)_minmax(450px,480px)] xl:pl-28 xl:pr-8 2xl:gap-12">
        <section className="grid min-w-0 gap-4">
          <div className="relative overflow-hidden rounded-[34px] border border-teal-100 bg-slate-950 text-white shadow-2xl shadow-teal-950/10">
            {settings.storefront_banner_url ? (
              <img src={settings.storefront_banner_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-38" />
            ) : null}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(72,243,248,0.28),transparent_30%),radial-gradient(circle_at_92%_10%,rgba(245,196,81,0.2),transparent_24%),linear-gradient(135deg,rgba(7,20,33,0.96),rgba(9,52,61,0.9)_58%,rgba(7,20,33,0.98))]" />
            <div className="relative grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-cyan-100">
                  Order online
                </div>
                <h2 className="mt-5 text-4xl font-black tracking-tight text-white sm:text-5xl">{displaySettings.business_name}</h2>
                <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-cyan-50/78 sm:text-base">
                  Browse the menu, choose pickup or delivery, and place your order from any device.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {settings.delivery_enabled !== false ? <span className="rounded-full bg-cyan-300 px-3 py-1.5 text-xs font-black text-slate-950">Delivery available</span> : null}
                  {settings.pickup_enabled !== false ? <span className="rounded-full border border-white/18 bg-white/10 px-3 py-1.5 text-xs font-black text-white">Pickup available</span> : null}
                  {settings.storefront_status === "live" ? <span className="rounded-full border border-emerald-300/40 bg-emerald-400/14 px-3 py-1.5 text-xs font-black text-emerald-100">Store live</span> : null}
                </div>
              </div>
              <div className="grid gap-3 rounded-[26px] border border-white/14 bg-white/10 p-4 backdrop-blur-md sm:min-w-64">
                <div className="flex items-center gap-3">
                  <img src={displaySettings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-14 w-14 rounded-2xl border border-white/20 bg-white object-contain p-1" />
                  <div>
                    <p className="text-sm font-black text-white">{displaySettings.business_name}</p>
                    <p className="text-xs font-bold text-cyan-50/65">{marketCountry} / {settings.currency}</p>
                  </div>
                </div>
                {settings.store_hours ? <p className="rounded-2xl bg-white/10 px-3 py-2 text-sm font-bold text-cyan-50">Hours: {settings.store_hours}</p> : null}
              </div>
            </div>
          </div>
          {threeDStorefrontEnabled ? (
            <div className="grid gap-3 rounded-[28px] border border-cyan-100 bg-white/92 p-4 shadow-xl shadow-teal-950/5 backdrop-blur sm:flex sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">Explore the 3D Store</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Browse products on virtual shelves, then checkout normally when you are ready.</p>
              </div>
              <div className="grid gap-2 sm:flex sm:shrink-0 sm:flex-wrap">
                <Button type="button" variant="primary" onClick={() => setShowVirtualStore(true)} className="rounded-full bg-slate-950 text-white hover:bg-teal-700">
                  Enter 3D Store
                </Button>
                <Button type="button" onClick={() => setShowVirtualStore(false)} className="rounded-full border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50">
                  Shop Normally
                </Button>
              </div>
            </div>
          ) : null}
          {threeDStorefrontEnabled && showVirtualStore ? (
            <VirtualStorefront
              products={products}
              categories={storefrontCategories}
              settings={displaySettings}
              onAddToCart={add}
              onExit={() => setShowVirtualStore(false)}
              onViewCart={() => {
                setShowVirtualStore(false);
                setMobileCheckoutOpen(true);
              }}
            />
          ) : null}
          {settings.storefront_status === "paused" ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
              This storefront is paused right now. You can view products, but ordering is temporarily unavailable.
            </p>
          ) : null}
          <div className="flex gap-2 overflow-x-auto scroll-smooth rounded-[26px] border border-slate-200 bg-white/95 p-2 shadow-lg shadow-slate-950/5">
            <button
              onClick={() => setCategory("all")}
              className={`min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                category === "all"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All
            </button>
            {storefrontCategories.map((item) => (
              <button
                key={item.id}
                onClick={() => setCategory(item.id)}
                className={`min-h-11 whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                  category === item.id
                    ? "bg-slate-950 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item.icon ? `${item.icon} ` : ""}{item.name}
              </button>
            ))}
          </div>
          {!storefrontCategories.length ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-500 shadow-sm">
              No categories yet. Add one in Settings.
            </p>
          ) : null}
          <div id="products" className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
            <div className="mb-1 flex flex-wrap items-end justify-between gap-3 sm:col-span-2 md:col-span-3 2xl:col-span-4">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-950">Featured products</h2>
                <p className="mt-1 text-sm font-semibold text-slate-500">Fresh picks from {displaySettings.business_name}</p>
              </div>
              <a href="#checkout" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700 shadow-sm hover:border-cyan-300 hover:text-cyan-700">View cart</a>
            </div>
            {statusMessage ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600 shadow-sm sm:col-span-2 md:col-span-3 xl:col-span-4">
                {statusMessage}
              </div>
            ) : null}
            {visibleProducts.map((product) => (
              <button key={product.id} onClick={() => add(product)} className="group min-h-[304px] min-w-0 overflow-hidden rounded-[30px] border border-slate-200 bg-white p-2 text-left shadow-lg shadow-slate-950/5 transition hover:-translate-y-1 hover:border-teal-300 hover:shadow-2xl hover:shadow-teal-950/10">
                <div className="relative h-44 overflow-hidden rounded-[24px] bg-slate-100 sm:h-48">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-teal-50 to-amber-50">
                      <ShoppingBag className="h-7 w-7 text-teal-600" />
                    </div>
                  )}
                </div>
                <div className="grid gap-3 p-3 sm:p-4">
                  <p className="line-clamp-2 min-h-10 text-base font-black leading-tight text-slate-950">{product.name}</p>
                  {product.description ? <p className="line-clamp-2 min-h-10 text-xs font-semibold leading-5 text-slate-500">{product.description}</p> : <p className="min-h-10 text-xs font-semibold leading-5 text-slate-500">Tap to add this item to your order.</p>}
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xl font-black text-teal-700">{formatMoney(product.selling_price)}</p>
                    <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white transition group-hover:bg-teal-700">Add</span>
                  </div>
                </div>
              </button>
            ))}
            {!visibleProducts.length ? (
              <div className="grid min-h-64 place-items-center rounded-[24px] border border-slate-200 bg-white p-6 text-center shadow-sm sm:col-span-2 md:col-span-3 xl:col-span-4">
                <div>
                  <p className="text-lg font-black text-slate-950">No products yet.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Products added by the business will appear here.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {mobileCheckoutOpen && !order ? (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm xl:hidden"
            onClick={() => setMobileCheckoutOpen(false)}
            aria-label="Close checkout drawer"
          />
        ) : null}
        <aside
          id="checkout"
          className={`min-w-0 gap-5 self-start scroll-mt-24 xl:sticky xl:top-24 xl:grid ${
            mobileCheckoutOpen && !order
              ? "fixed inset-x-0 bottom-0 z-50 grid max-h-[88vh] overflow-auto rounded-t-[34px] bg-slate-50 p-4 shadow-2xl xl:relative xl:max-h-none xl:overflow-visible xl:rounded-none xl:bg-transparent xl:p-0 xl:shadow-none"
              : order
                ? "grid"
                : "hidden"
          }`}
        >
          {!order ? (
            <div className="flex items-center justify-between xl:hidden">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">Checkout drawer</p>
                <h2 className="text-xl font-black tracking-tight text-slate-950">Complete your order</h2>
              </div>
              <button type="button" onClick={() => setMobileCheckoutOpen(false)} className="grid h-11 w-11 place-items-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm" aria-label="Close checkout drawer">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {!order ? (
            <>
          <section className="rounded-[32px] border border-slate-200 bg-white shadow-2xl shadow-slate-950/10">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-black tracking-tight text-slate-950">Your order</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">{cart.length ? `${cart.length} item${cart.length === 1 ? "" : "s"} selected` : "Build your cart from the menu"}</p>
            </div>
            <div className="max-h-64 overflow-auto">
              {cart.map((item) => (
                <div key={item.id} className="grid gap-3 border-b border-slate-100 p-4">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} loading="lazy" className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                      ) : (
                        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-slate-100 text-xs font-black text-teal-700">{item.name.slice(0, 2).toUpperCase()}</span>
                      )}
                      <p className="min-w-0 text-sm font-black leading-tight text-slate-950">{item.name}</p>
                    </div>
                    <button className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-red-50 hover:text-red-600" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remove ${item.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50">
                      <button className="grid h-9 w-9 place-items-center text-slate-600" onClick={() => update(item.id, -1)}><Minus className="h-4 w-4" /></button>
                      <span className="grid h-9 w-9 place-items-center font-black text-slate-950">{item.quantity}</span>
                      <button className="grid h-9 w-9 place-items-center text-slate-600" onClick={() => update(item.id, 1)}><Plus className="h-4 w-4" /></button>
                    </div>
                    <strong className="text-slate-950">{formatMoney(item.selling_price * item.quantity)}</strong>
                  </div>
                </div>
              ))}
              {!cart.length ? (
                <div className="grid place-items-center p-8 text-center">
                  <ShoppingBag className="h-8 w-8 text-slate-300" />
                  <p className="mt-3 text-sm font-semibold text-slate-500">Select products to start your order.</p>
                </div>
              ) : null}
            </div>
            <div className="grid gap-2 border-t border-slate-200 bg-gradient-to-br from-slate-50 to-teal-50/45 p-5 text-sm text-slate-600">
              <div className="flex justify-between"><span>Subtotal</span><strong className="text-slate-950">{formatMoney(subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong className="text-slate-950">{formatMoney(tax)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong className="text-slate-950">{formatMoney(deliveryFee)}</strong></div>
              <div className="mt-2 flex justify-between rounded-2xl bg-slate-950 px-4 py-3 text-xl font-black text-white"><span>Total</span><span>{formatMoney(total)}</span></div>
            </div>
          </section>

          <section className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/10 sm:p-6">
            <div className="mb-4">
              <h2 className="text-lg font-black tracking-tight text-slate-950">Checkout</h2>
              <p className="mt-1 text-sm font-semibold text-slate-500">Confirm your contact, address, and payment preference.</p>
            </div>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFulfillment("delivery")}
                  disabled={settings.delivery_enabled === false}
                  className={`min-h-11 rounded-full text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${fulfillment === "delivery" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Delivery
                </button>
                <button
                  onClick={() => setFulfillment("pickup")}
                  disabled={settings.pickup_enabled === false}
                  className={`min-h-11 rounded-full text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-45 ${fulfillment === "pickup" ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  Pickup
                </button>
              </div>
              <StoreField label="Full name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              <StoreField label="Phone" placeholder="(246) 000-0000" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              <StoreField label="Email optional" placeholder="you@example.com" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
              {fulfillment === "delivery" ? (
                <div className="grid gap-3">
                  <StoreField label="Street address" placeholder="Street address" value={customer.street_address} onChange={(event) => setCustomer({ ...customer, street_address: event.target.value })} />
                  <StoreField label="City" placeholder="City" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StoreField label="Country" value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })} />
                    <StoreField label="Postal code optional" placeholder="00000" value={customer.postal_code} onChange={(event) => setCustomer({ ...customer, postal_code: event.target.value })} />
                  </div>
                  <StoreSelect label={deliveryRegionLabel} value={customer.region} onChange={(event) => setCustomer({ ...customer, region: event.target.value })}>
                    {deliveryRegions.map((region) => <option key={region}>{region}</option>)}
                  </StoreSelect>
                  <StoreField label="Apt/Suite optional" value={customer.delivery_notes} onChange={(event) => setCustomer({ ...customer, delivery_notes: event.target.value })} placeholder="Apt, suite, landmark" />
                  <Button type="button" variant="secondary" onClick={captureLocation} disabled={locating} className="border-slate-200 bg-white text-slate-800 hover:border-teal-300 hover:bg-teal-50">
                    <LocateFixed className="h-4 w-4" />
                    {locating ? "Finding your location..." : "Use My Current Location"}
                  </Button>
                  {locationStatus ? <p className="text-xs font-bold text-teal-700">{locationStatus}</p> : null}
                  <StoreField label="Shared location link optional" value={locationLink} onChange={(event) => setLocationLink(event.target.value)} />
                </div>
              ) : null}
              <StoreSelect label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {enabledPaymentMethods.map((method) => <option key={method}>{method}</option>)}
              </StoreSelect>
              <label className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500">
                <input
                  type="checkbox"
                  checked={customer.marketing_consent}
                  onChange={(event) => setCustomer({ ...customer, marketing_consent: event.target.checked })}
                  className="mt-1"
                />
                I agree to receive optional marketing messages. My order data will be stored for receipts, delivery, loyalty, and customer service.
              </label>
              {error ? <p className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
              <Button variant="primary" size="lg" onClick={submitOrder} disabled={loading || Boolean(order)} className="rounded-full bg-slate-950 text-white hover:bg-teal-700">
                <Lock className="h-4 w-4" />
                {loading ? "Submitting..." : "Proceed to payment"}
              </Button>
            </div>
          </section>

          </>
          ) : null}

          {order ? (
            <section className="rounded-[28px] border border-emerald-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="grid gap-5 text-center sm:text-left">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 sm:mx-0">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Order received</p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Order received</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
                    Thank you. The business has your order and will update you as it moves forward.
                  </p>
                </div>
                <dl className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50 p-4 text-left text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-bold text-slate-500">Order number</dt>
                    <dd className="font-black text-slate-950">#{order.order_number}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-bold text-slate-500">Total</dt>
                    <dd className="font-black text-slate-950">{formatMoney(order.total)}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-bold text-slate-500">Type</dt>
                    <dd className="font-black capitalize text-slate-950">{order.order_type === "delivery" ? "Delivery" : order.order_type === "pickup" ? "Pickup" : "Online order"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="font-bold text-slate-500">Payment status</dt>
                    <dd className="font-black capitalize text-slate-950">{order.payment_status}</dd>
                  </div>
                </dl>
                <div className="rounded-[22px] border border-teal-100 bg-teal-50 p-4 text-left">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-teal-700">Next step</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                    {order.order_type === "delivery"
                      ? "Your order is waiting for the business to accept it. They will prepare it and arrange delivery."
                      : "Your order is waiting for the business to accept it. They will let you know when it is ready for pickup."}
                  </p>
                </div>
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      {!order && cart.length ? (
        <button type="button" onClick={() => setMobileCheckoutOpen(true)} className="fixed inset-x-3 bottom-3 z-40 grid rounded-full bg-slate-950 px-5 py-3 text-white shadow-2xl xl:hidden">
          <span className="flex items-center justify-between gap-3 text-sm font-black">
            <span>{cart.length} item{cart.length === 1 ? "" : "s"}</span>
            <span>Checkout - {formatMoney(total)}</span>
          </span>
        </button>
      ) : null}
      <section className="mx-auto grid max-w-[1620px] gap-3 px-4 pb-6 xl:pl-28 xl:pr-6 sm:grid-cols-2 lg:grid-cols-4">
        {[{ icon: ShieldCheck, title: "Secure checkout", copy: "Protected order details" }, { icon: Truck, title: "Fast delivery", copy: "Delivery or pickup" }, { icon: Store, title: "Local storefront", copy: "Powered by Caribbean POS Connect" }, { icon: Headphones, title: "Support", copy: "Help when you need it" }].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="flex items-center gap-3 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-950/5">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-cyan-700"><Icon className="h-5 w-5" /></span>
              <span><strong className="block text-sm font-black text-slate-950">{item.title}</strong><span className="text-xs font-semibold text-slate-500">{item.copy}</span></span>
            </div>
          );
        })}
      </section>
      <footer className="mx-auto flex max-w-[1620px] flex-wrap gap-3 px-4 pb-8 text-sm font-bold text-slate-500 xl:pl-28 xl:pr-6">
        <a href="/privacy" className="hover:text-teal-700">Privacy policy</a>
        <a href="/contact" className="hover:text-teal-700">Contact</a>
      </footer>
    </main>
  );
}

