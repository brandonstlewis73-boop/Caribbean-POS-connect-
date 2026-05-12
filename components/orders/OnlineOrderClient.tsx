"use client";

import { useEffect, useMemo, useState } from "react";
import { CreditCard, ExternalLink, LocateFixed, MessageCircle, Minus, Plus, Send, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Badge } from "@/components/ui/Badge";
import { getDefaultCountryForCurrency, getDeliveryRegionsForCurrency, money, PAYMENT_METHODS, PRODUCT_CATEGORIES } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { detectCurrentAddress } from "@/lib/location-client";
import type { OnlineMarket } from "@/lib/online-market";
import type { Order, Product, Settings } from "@/lib/types";

type CartItem = Product & { quantity: number };

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

export function OnlineOrderClient({
  products: initialProducts,
  settings: initialSettings,
  market: initialMarket = null,
  initialStatusMessage = "",
  menuEndpoint = "/api/online",
  orderEndpoint = "/api/orders",
  businessId = null,
  storefrontSlug = null
}: {
  products: Product[];
  settings: Settings;
  market?: OnlineMarket | null;
  initialStatusMessage?: string;
  menuEndpoint?: string;
  orderEndpoint?: string;
  businessId?: string | null;
  storefrontSlug?: string | null;
}) {
  const [products, setProducts] = useState(initialProducts);
  const [settings, setSettings] = useState(initialSettings);
  const [market, setMarket] = useState<OnlineMarket | null>(initialMarket);
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [fulfillment, setFulfillment] = useState<"pickup" | "delivery">("delivery");
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

  useEffect(() => {
    let cancelled = false;
    async function loadOnlineMenu() {
      try {
        const separator = menuEndpoint.includes("?") ? "&" : "?";
        const response = await fetch(`${menuEndpoint}${window.location.search ? `${separator}${window.location.search.slice(1)}` : ""}`, { cache: "no-store" });
        const payload = await readApiPayload<{
          products: Product[];
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

  const visibleProducts = useMemo(
    () => products.filter((product) => category === "All" || product.category === category),
    [products, category]
  );
  const enabledPaymentMethods = PAYMENT_METHODS.filter((method) => paymentMethodEnabled(method, settings));
  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const tax = settings.tax_enabled ? subtotal * (settings.tax_rate / 100) : 0;
  const deliveryFee =
    fulfillment === "delivery"
      ? Number((settings.delivery_rates || {})[customer.region] ?? settings.delivery_fee ?? 0)
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

  function add(product: Product) {
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
    setError("");
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
    <main className="min-h-screen overflow-x-hidden bg-caribbean-cloud text-caribbean-ink dark:bg-slate-950 dark:text-white">
      <header className="border-b border-caribbean-line bg-white px-4 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img src={settings.logo_url || "/logo.svg"} alt="" className="h-11 w-11 shrink-0 rounded-card bg-white object-contain p-1" />
            <div className="min-w-0">
              <h1 className="text-lg font-black leading-tight">{settings.business_name}</h1>
              <p className="text-sm font-semibold text-slate-500">Online ordering - {marketCountry} / {settings.currency}</p>
            </div>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {settings.facebook_url ? (
              <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-sm font-bold leading-tight dark:border-slate-700 dark:bg-slate-900">
                <ExternalLink className="h-4 w-4" />
                Facebook
              </a>
            ) : null}
            {settings.instagram_url ? (
              <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-sm font-bold leading-tight dark:border-slate-700 dark:bg-slate-900">
                <ExternalLink className="h-4 w-4" />
                Instagram
              </a>
            ) : null}
            <div className="rounded-card border border-caribbean-line bg-caribbean-cloud px-3 py-2 text-sm font-bold dark:border-slate-700 dark:bg-slate-900">
              Cart {cart.length} - {formatMoney(total)}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl min-w-0 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
        <section className="grid min-w-0 gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {["All", ...PRODUCT_CATEGORIES].map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-card px-3 py-2 text-sm font-black ${
                  category === item
                    ? "bg-caribbean-teal text-white"
                    : "border border-caribbean-line bg-white dark:border-slate-700 dark:bg-slate-900"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {statusMessage ? (
              <div className="rounded-card border border-caribbean-line bg-white p-4 text-sm font-bold text-slate-600 shadow-soft dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 sm:col-span-2 md:col-span-3 xl:col-span-4">
                {statusMessage}
              </div>
            ) : null}
            {visibleProducts.map((product) => (
              <button key={product.id} onClick={() => add(product)} className="min-h-[220px] min-w-0 overflow-hidden rounded-card border border-caribbean-line bg-white text-left shadow-soft transition hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
                <div className="relative h-28 bg-gradient-to-br from-teal-50 to-orange-50 dark:from-teal-950 dark:to-slate-900">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="grid h-full place-items-center">
                      <ShoppingBag className="h-6 w-6 text-caribbean-teal" />
                    </div>
                  )}
                  <div className="absolute right-2 top-2">
                    <Badge tone={product.stock_quantity <= product.low_stock_alert ? "red" : "green"}>{product.stock_quantity}</Badge>
                  </div>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 min-h-10 text-sm font-black leading-tight">{product.name}</p>
                  <p className="mt-2 text-lg font-black text-caribbean-teal">{formatMoney(product.selling_price)}</p>
                </div>
              </button>
            ))}
            {!visibleProducts.length ? (
              <div className="grid min-h-64 place-items-center rounded-card border border-caribbean-line bg-white p-6 text-center shadow-soft dark:border-slate-800 dark:bg-slate-900 sm:col-span-2 md:col-span-3 xl:col-span-4">
                <div>
                  <p className="text-lg font-black">No products yet.</p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Products added by the business will appear here.</p>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-4">
          <section className="rounded-card border border-caribbean-line bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="border-b border-caribbean-line px-4 py-3 dark:border-slate-800">
              <h2 className="font-black">Your order</h2>
            </div>
            <div className="max-h-64 overflow-auto">
              {cart.map((item) => (
                <div key={item.id} className="grid gap-2 border-b border-caribbean-line p-3 dark:border-slate-800">
                  <div className="flex min-w-0 justify-between gap-3">
                    <p className="min-w-0 text-sm font-black leading-tight">{item.name}</p>
                    <button className="shrink-0" onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))} aria-label={`Remove ${item.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex shrink-0 items-center rounded-card border border-caribbean-line dark:border-slate-700">
                      <button className="grid h-9 w-9 place-items-center" onClick={() => update(item.id, -1)}><Minus className="h-4 w-4" /></button>
                      <span className="grid h-9 w-9 place-items-center font-black">{item.quantity}</span>
                      <button className="grid h-9 w-9 place-items-center" onClick={() => update(item.id, 1)}><Plus className="h-4 w-4" /></button>
                    </div>
                    <strong>{formatMoney(item.selling_price * item.quantity)}</strong>
                  </div>
                </div>
              ))}
              {!cart.length ? <p className="p-4 text-sm font-semibold text-slate-500">Select products to start.</p> : null}
            </div>
            <div className="grid gap-1 p-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong>{formatMoney(tax)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong>{formatMoney(deliveryFee)}</strong></div>
              <div className="mt-2 flex justify-between text-xl font-black"><span>Total</span><span>{formatMoney(total)}</span></div>
            </div>
          </section>

          <section className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setFulfillment("delivery")} className={`h-10 rounded-card text-sm font-black ${fulfillment === "delivery" ? "bg-caribbean-teal text-white" : "border border-caribbean-line dark:border-slate-700"}`}>Delivery</button>
                <button onClick={() => setFulfillment("pickup")} className={`h-10 rounded-card text-sm font-black ${fulfillment === "pickup" ? "bg-caribbean-teal text-white" : "border border-caribbean-line dark:border-slate-700"}`}>Pickup</button>
              </div>
              <Field label="Name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
              <Field label="Phone" value={customer.phone} onChange={(event) => setCustomer({ ...customer, phone: event.target.value })} />
              <Field label="Email optional" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
              {fulfillment === "delivery" ? (
                <div className="grid gap-3">
                  <Field label="Street address" value={customer.street_address} onChange={(event) => setCustomer({ ...customer, street_address: event.target.value })} />
                  <Field label="City/town" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Country" value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })} />
                    <Field label="Postal code optional" value={customer.postal_code} onChange={(event) => setCustomer({ ...customer, postal_code: event.target.value })} />
                  </div>
                  <SelectField label={deliveryRegionLabel} value={customer.region} onChange={(event) => setCustomer({ ...customer, region: event.target.value })}>
                    {deliveryRegions.map((region) => <option key={region}>{region}</option>)}
                  </SelectField>
                  <TextAreaField label="Delivery instructions" value={customer.delivery_notes} onChange={(event) => setCustomer({ ...customer, delivery_notes: event.target.value })} />
                  <Button type="button" onClick={captureLocation} disabled={locating}>
                    <LocateFixed className="h-4 w-4" />
                    {locating ? "Finding your location..." : "Use My Current Location"}
                  </Button>
                  {locationStatus ? <p className="text-xs font-bold text-caribbean-teal">{locationStatus}</p> : null}
                  <Field label="Shared location link optional" value={locationLink} onChange={(event) => setLocationLink(event.target.value)} />
                </div>
              ) : null}
              <SelectField label="Payment method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {enabledPaymentMethods.map((method) => <option key={method}>{method}</option>)}
              </SelectField>
              <label className="flex items-start gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={customer.marketing_consent}
                  onChange={(event) => setCustomer({ ...customer, marketing_consent: event.target.checked })}
                  className="mt-1"
                />
                I agree to receive optional marketing messages. My order data will be stored for receipts, delivery, loyalty, and customer service.
              </label>
              {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
              <Button variant="primary" size="lg" onClick={submitOrder} disabled={loading}>
                <Send className="h-4 w-4" />
                {loading ? "Submitting..." : "Submit order"}
              </Button>
            </div>
          </section>

          {order ? (
            <section className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-black">Order #{order.order_number} received</h2>
              <p className="mt-2 text-sm font-semibold text-slate-500">Total: {formatMoney(order.total)}</p>
              <div className="mt-4 grid gap-2">
                {order.whatsapp_business_link ? (
                  <a href={order.whatsapp_business_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-palm px-3 py-2 text-center text-sm font-black leading-tight text-white">
                    <MessageCircle className="h-4 w-4" />
                    Send order to WhatsApp
                  </a>
                ) : null}
                {order.payment_link ? (
                  <a href={order.payment_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-mango px-3 py-2 text-center text-sm font-black leading-tight text-slate-950">
                    <CreditCard className="h-4 w-4" />
                    Pay order
                  </a>
                ) : null}
                {order.whatsapp_customer_link ? (
                  <a href={order.whatsapp_customer_link} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp confirmation
                  </a>
                ) : null}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
      <footer className="mx-auto flex max-w-7xl flex-wrap gap-3 px-4 pb-6 text-sm font-bold text-slate-500">
        <a href="/privacy" className="hover:text-caribbean-teal">Privacy policy</a>
        <a href="/contact" className="hover:text-caribbean-teal">Contact</a>
        <a href="/login" className="hover:text-caribbean-teal">Staff login</a>
      </footer>
    </main>
  );
}
