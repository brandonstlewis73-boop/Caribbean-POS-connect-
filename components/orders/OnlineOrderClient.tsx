"use client";

/* eslint-disable @next/next/no-img-element */

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CheckCircle2, ExternalLink, LocateFixed, Minus, Plus, Send, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { getDefaultCountryForCurrency, getDeliveryRegionsForCurrency, money, PAYMENT_METHODS } from "@/lib/constants";
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

function StoreTextArea({ label, className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-bold text-slate-700">
      <span>{label}</span>
      <textarea
        className={`min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 ${className || ""}`}
        {...props}
      />
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
  const [showVirtualStore, setShowVirtualStore] = useState(false);

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
    } catch {
      setError("Order could not be submitted. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7faf8] pb-24 text-slate-950 xl:pb-0">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-4 py-4 shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={settings.logo_url || "/caribbean-pos-connect-icon.png"} alt="" className="h-12 w-12 shrink-0 rounded-2xl border border-slate-200 bg-white object-contain p-1 shadow-sm" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black leading-tight tracking-tight text-slate-950">{settings.business_name}</h1>
              <p className="text-sm font-semibold text-slate-500">Online ordering - {marketCountry} / {settings.currency}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {settings.facebook_url ? (
              <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-tight text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-700">
                <ExternalLink className="h-4 w-4" />
                Facebook
              </a>
            ) : null}
            {settings.instagram_url ? (
              <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold leading-tight text-slate-700 shadow-sm hover:border-teal-300 hover:text-teal-700">
                <ExternalLink className="h-4 w-4" />
                Instagram
              </a>
            ) : null}
            {!order ? (
              <a href="#checkout" className="rounded-full border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-black text-teal-800 shadow-sm">
                Cart {cart.length} - {formatMoney(total)}
              </a>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl min-w-0 gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_minmax(380px,420px)]">
        <section className="grid min-w-0 gap-4">
          <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            {settings.storefront_banner_url ? (
              <img src={settings.storefront_banner_url} alt="" className="h-44 w-full object-cover sm:h-56" />
            ) : (
              <div className="h-32 bg-gradient-to-br from-teal-50 via-white to-amber-50 sm:h-44" />
            )}
            <div className="grid gap-4 p-5 sm:flex sm:items-end sm:justify-between sm:p-6">
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-teal-700">Order online</p>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{settings.business_name}</h2>
                <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
                  Choose your items, select pickup or delivery, and submit your order securely.
                </p>
              </div>
              {settings.store_hours ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  Hours: {settings.store_hours}
                </div>
              ) : null}
            </div>
          </div>
          {threeDStorefrontEnabled ? (
            <div className="grid gap-3 rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-950">Premium 3D Storefront</p>
                <p className="mt-1 text-sm font-semibold text-slate-500">Walk through a lightweight virtual shop, tap products, then checkout normally.</p>
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
              settings={settings}
              onAddToCart={add}
              onExit={() => setShowVirtualStore(false)}
            />
          ) : null}
          {settings.storefront_status === "paused" ? (
            <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-black text-amber-800">
              This storefront is paused right now. You can view products, but ordering is temporarily unavailable.
            </p>
          ) : null}
          <div className="flex gap-2 overflow-x-auto scroll-smooth rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
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
          <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {statusMessage ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-600 shadow-sm sm:col-span-2 md:col-span-3 xl:col-span-4">
                {statusMessage}
              </div>
            ) : null}
            {visibleProducts.map((product) => (
              <button key={product.id} onClick={() => add(product)} className="group min-h-[248px] min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
                <div className="relative h-36 bg-slate-100">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-teal-50 to-amber-50">
                      <ShoppingBag className="h-7 w-7 text-teal-600" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge tone={product.stock_quantity <= product.low_stock_alert ? "red" : "green"}>{product.stock_quantity}</Badge>
                  </div>
                </div>
                <div className="grid gap-3 p-4">
                  <p className="line-clamp-2 min-h-10 text-base font-black leading-tight text-slate-950">{product.name}</p>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-lg font-black text-teal-700">{formatMoney(product.selling_price)}</p>
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-black text-white transition group-hover:bg-teal-700">Add</span>
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

        <aside id="checkout" className="grid min-w-0 gap-4 self-start scroll-mt-24 xl:sticky xl:top-24">
          {!order ? (
            <>
          <section className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
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
            <div className="grid gap-2 border-t border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-600">
              <div className="flex justify-between"><span>Subtotal</span><strong className="text-slate-950">{formatMoney(subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong className="text-slate-950">{formatMoney(tax)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong className="text-slate-950">{formatMoney(deliveryFee)}</strong></div>
              <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-xl font-black text-slate-950"><span>Total</span><span>{formatMoney(total)}</span></div>
            </div>
          </section>

          <section className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
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
              <StoreField label="Name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              <StoreField label="Phone" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              <StoreField label="Email optional" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
              {fulfillment === "delivery" ? (
                <div className="grid gap-3">
                  <StoreField label="Street address" value={customer.street_address} onChange={(event) => setCustomer({ ...customer, street_address: event.target.value })} />
                  <StoreField label="City/town" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <StoreField label="Country" value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })} />
                    <StoreField label="Postal code optional" value={customer.postal_code} onChange={(event) => setCustomer({ ...customer, postal_code: event.target.value })} />
                  </div>
                  <StoreSelect label={deliveryRegionLabel} value={customer.region} onChange={(event) => setCustomer({ ...customer, region: event.target.value })}>
                    {deliveryRegions.map((region) => <option key={region}>{region}</option>)}
                  </StoreSelect>
                  <StoreTextArea label="Delivery instructions" value={customer.delivery_notes} onChange={(event) => setCustomer({ ...customer, delivery_notes: event.target.value })} />
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
                <Send className="h-4 w-4" />
                {loading ? "Submitting..." : "Submit order"}
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
        <a href="#checkout" className="fixed inset-x-3 bottom-3 z-40 grid rounded-full bg-slate-950 px-5 py-3 text-white shadow-2xl xl:hidden">
          <span className="flex items-center justify-between gap-3 text-sm font-black">
            <span>{cart.length} item{cart.length === 1 ? "" : "s"}</span>
            <span>Checkout - {formatMoney(total)}</span>
          </span>
        </a>
      ) : null}
      <footer className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 pb-8 text-sm font-bold text-slate-500">
        <a href="/privacy" className="hover:text-teal-700">Privacy policy</a>
        <a href="/contact" className="hover:text-teal-700">Contact</a>
      </footer>
    </main>
  );
}
