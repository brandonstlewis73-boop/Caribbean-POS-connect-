"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Banknote,
  Barcode,
  Camera,
  CreditCard,
  LocateFixed,
  Minus,
  PackageCheck,
  Plus,
  Printer,
  ReceiptText,
  RefreshCw,
  Search,
  Send,
  Trash2,
  X
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  getDefaultCountryForCurrency,
  getDeliveryRegionsForCurrency,
  money,
  PAYMENT_METHODS,
  PRODUCT_CATEGORIES
} from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { detectCurrentAddress } from "@/lib/location-client";
import type { Customer, Order, Product, Settings, User } from "@/lib/types";

type CartItem = Product & { quantity: number; discount: number };
type BarcodeDetectorResult = { rawValue?: string };
type BarcodeDetectorInstance = { detect(source: HTMLVideoElement): Promise<BarcodeDetectorResult[]> };
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorInstance;

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
    notes: "",
    birthday: "",
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

export function POSClient({
  products: initialProducts,
  customers: initialCustomers,
  settings,
  drivers
}: {
  products: Product[];
  customers: Customer[];
  settings: Settings;
  drivers: User[];
}) {
  const [products, setProducts] = useState(initialProducts);
  const [customers, setCustomers] = useState(initialCustomers);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState(() => emptyCustomer(settings.currency));
  const [orderType, setOrderType] = useState<"in_store" | "pickup" | "delivery">("in_store");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "unpaid" | "partial">("paid");
  const [discount, setDiscount] = useState(0);
  const [assignedDriver, setAssignedDriver] = useState("");
  const [location, setLocation] = useState({ latitude: "", longitude: "", link: "" });
  const [locationStatus, setLocationStatus] = useState("");
  const [locating, setLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const addProductByBarcodeRef = useRef<(rawCode: string) => boolean>(() => false);
  const deferredQuery = useDeferredValue(query);
  const customerByPhoneSuffix = useMemo(() => {
    const lookup = new Map<string, Customer>();
    for (const item of customers) {
      const digits = item.phone?.replace(/[^\d]/g, "");
      if (digits && digits.length >= 7) lookup.set(digits.slice(-7), item);
    }
    return lookup;
  }, [customers]);

  const filteredProducts = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    return products.filter((product) => {
      const categoryMatch = category === "All" || product.category === category;
      const queryMatch =
        !normalized ||
        [product.name, product.sku, product.barcode, product.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      return categoryMatch && queryMatch;
    });
  }, [products, deferredQuery, category]);
  const enabledPaymentMethods = PAYMENT_METHODS.filter((method) => paymentMethodEnabled(method, settings));

  const subtotal = cart.reduce((sum, item) => sum + item.selling_price * item.quantity, 0);
  const discountTotal = cart.reduce((sum, item) => sum + item.discount, 0) + discount;
  const taxable = Math.max(0, subtotal - discountTotal);
  const tax = settings.tax_enabled ? taxable * (settings.tax_rate / 100) : 0;
  const deliveryFee =
    orderType === "delivery"
      ? Number((settings.delivery_rates || {})[customer.region] ?? settings.delivery_fee ?? 0)
      : 0;
  const total = taxable + tax + deliveryFee;
  const formatMoney = (value: number | string | null | undefined) => money(value, settings.currency);
  const deliveryRegions = getDeliveryRegionsForCurrency(settings.currency);
  const defaultDeliveryRegion = deliveryRegions[0] || "";
  const defaultCountry = getDefaultCountryForCurrency(settings.currency);
  const deliveryRegionLabel = settings.currency === "USD" ? "State / territory" : "Delivery region";

  useEffect(() => {
    barcodeInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!scannerOpen) {
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
      return;
    }

    let stopped = false;
    async function startScanner() {
      setScannerError("");
      const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;
      if (!Detector) {
        setScannerError("Camera barcode scanning is not supported in this browser. Use manual barcode entry or a USB scanner.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setScannerError("Camera access is not available in this browser.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false
        });
        scannerStreamRef.current = stream;
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new Detector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"]
        });
        const scan = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const results = await detector.detect(videoRef.current);
            const code = results[0]?.rawValue;
            if (code && addProductByBarcodeRef.current(code)) {
              setScannerOpen(false);
              return;
            }
          } catch {
            // Keep scanning; unsupported frames should not close the scanner.
          }
          window.setTimeout(scan, 350);
        };
        scan();
      } catch {
        setScannerError("Camera permission was denied or the camera is unavailable.");
      }
    }

    startScanner();
    return () => {
      stopped = true;
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    };
  }, [scannerOpen]);

  function addProduct(product: Product) {
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1, discount: 0 }];
    });
  }

  function normalizeBarcode(value: string) {
    return value.trim().replace(/\s/g, "").toLowerCase();
  }

  function playScanBeep() {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const audio = new AudioContextClass();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = 880;
      gain.gain.value = 0.04;
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start();
      window.setTimeout(() => {
        oscillator.stop();
        audio.close();
      }, 90);
    } catch {
      // Audio feedback is optional.
    }
  }

  function addProductByBarcode(rawCode: string) {
    const code = normalizeBarcode(rawCode);
    if (!code) return false;
    const product = products.find((item) =>
      [item.barcode, item.sku]
        .filter(Boolean)
        .map((value) => normalizeBarcode(String(value)))
        .includes(code)
    );
    if (!product) {
      setBarcodeMessage(`Barcode ${rawCode.trim()} was not found.`);
      setError(`Barcode ${rawCode.trim()} was not found in inventory.`);
      return false;
    }
    addProduct(product);
    playScanBeep();
    setError("");
    setBarcodeInput("");
    setBarcodeMessage(`${product.name} added from barcode.`);
    window.setTimeout(() => barcodeInputRef.current?.focus(), 50);
    return true;
  }
  addProductByBarcodeRef.current = addProductByBarcode;

  function submitBarcode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addProductByBarcode(barcodeInput);
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) =>
      current
        .map((item) =>
          item.id === productId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function loadCustomerByPhone(value: string) {
    setCustomer((current) => ({ ...current, phone: value }));
    const digits = value.replace(/[^\d]/g, "");
    if (digits.length < 7) return;
    const found = customerByPhoneSuffix.get(digits.slice(-7));
    if (found) {
      setCustomer({
        name: found.name || "",
        phone: found.phone || value,
        email: found.email || "",
        street_address: found.street_address || "",
        city: found.city || "",
        region: found.region && deliveryRegions.includes(found.region) ? found.region : defaultDeliveryRegion,
        country: found.country || defaultCountry,
        postal_code: found.postal_code || "",
        delivery_notes: found.delivery_notes || "",
        notes: found.notes || "",
        birthday: found.birthday || "",
        marketing_consent: found.marketing_consent
      });
    }
  }

  async function refreshSaleData() {
    setError("");
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/pos");
      const payload = await readApiPayload<{ products: Product[]; customers: Customer[] }>(response);
      if (!response.ok) throw new Error(payload.error || "Could not refresh POS data.");
      if (payload.data?.products) setProducts(payload.data.products);
      if (payload.data?.customers) setCustomers(payload.data.customers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh POS data.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function captureLocation() {
    setError("");
    setLocationStatus("Finding your location...");
    setLocating(true);
    try {
      const { address } = await detectCurrentAddress();
      setLocation({
        latitude: String(address.lat),
        longitude: String(address.lng),
        link: `https://maps.google.com/?q=${address.lat},${address.lng}`
      });
      setCustomer((current) => ({
        ...current,
        street_address: address.street || address.formatted || current.street_address,
        city: address.city || current.city,
        region: address.region || current.region,
        country: address.country || current.country,
        postal_code: address.postalCode || current.postal_code
      }));
      setLocationStatus("Address added. Please check it before completing checkout.");
    } catch (err) {
      setLocationStatus("");
      setError(err instanceof Error ? err.message : "Unable to capture GPS location. Enter the address manually or paste a shared location link.");
    } finally {
      setLocating(false);
    }
  }

  async function completeSale() {
    setError("");
    if (!cart.length) {
      setError("Add at least one product before completing checkout.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({
            product_id: item.id,
            quantity: item.quantity,
            discount: item.discount
          })),
          customer,
          order_type: orderType,
          payment_method: paymentMethod,
          payment_status: paymentStatus,
          discount_amount: discount,
          delivery_fee: deliveryFee,
          assigned_driver_id: assignedDriver || undefined,
          notes: customer.notes,
          delivery:
            orderType === "delivery"
              ? {
                  street_address: customer.street_address,
                  city: customer.city,
                  region: customer.region,
                  country: customer.country,
                  postal_code: customer.postal_code,
                  notes: customer.delivery_notes,
                  latitude: location.latitude ? Number(location.latitude) : undefined,
                  longitude: location.longitude ? Number(location.longitude) : undefined,
                  location_link: location.link
                }
              : undefined
        })
      });
      const payload = await readApiPayload<{ order: Order }>(response);
      if (!response.ok) throw new Error(payload.error || "Checkout failed");
      if (!payload.data?.order) throw new Error("Checkout completed, but no order was returned.");
      setLastOrder(payload.data.order);
      setCart([]);
      setDiscount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div className="grid min-w-0 gap-4">
        <Panel>
          <div className="grid min-w-0 gap-3 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(260px,360px)_auto_auto]">
            <label className="relative min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by product, SKU, barcode, or category"
                className="h-12 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-base font-semibold outline-none focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900"
              />
            </label>
            <form onSubmit={submitBarcode} className="relative min-w-0">
              <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                ref={barcodeInputRef}
                value={barcodeInput}
                onChange={(event) => setBarcodeInput(event.target.value)}
                placeholder="Scan or enter barcode"
                className="h-12 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-base font-semibold outline-none focus:border-caribbean-teal focus:ring-2 focus:ring-teal-100 dark:border-slate-700 dark:bg-slate-900"
              />
            </form>
            <Button variant="primary" size="lg" onClick={() => addProductByBarcode(barcodeInput)} disabled={!barcodeInput.trim()}>
              <Barcode className="h-4 w-4" />
              Add
            </Button>
            <Button size="lg" onClick={() => setScannerOpen(true)}>
              <Camera className="h-4 w-4" />
              Camera
            </Button>
            <Button size="lg" onClick={refreshSaleData} disabled={isRefreshing}>
              <RefreshCw className="h-4 w-4" />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
          {barcodeMessage ? (
            <p className={`mx-4 mb-4 rounded-card p-3 text-sm font-bold ${
              barcodeMessage.includes("not found") ? "bg-red-50 text-red-700" : "bg-teal-50 text-teal-800"
            }`}>
              {barcodeMessage}
            </p>
          ) : null}
          <div className="flex gap-2 overflow-x-auto border-t border-caribbean-line px-4 py-3 dark:border-slate-800">
            {["All", ...PRODUCT_CATEGORIES].map((item) => (
              <button
                key={item}
                onClick={() => setCategory(item)}
                className={`whitespace-nowrap rounded-card px-3 py-2 text-sm font-bold transition ${
                  category === item
                    ? "bg-caribbean-teal text-white"
                    : "border border-caribbean-line bg-white text-slate-600 hover:bg-caribbean-cloud dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addProduct(product)}
              className="min-h-[220px] min-w-0 overflow-hidden rounded-card border border-caribbean-line bg-white text-left shadow-soft transition hover:-translate-y-0.5 hover:border-caribbean-teal dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="relative h-28 bg-gradient-to-br from-teal-50 to-orange-50 dark:from-teal-950 dark:to-slate-900">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="grid h-full place-items-center text-xl font-black text-caribbean-teal">
                    {product.name
                      .split(" ")
                      .slice(0, 2)
                      .map((word) => word[0])
                      .join("")}
                  </div>
                )}
                <div className="absolute right-2 top-2">
                  <Badge tone={product.stock_quantity <= product.low_stock_alert ? "red" : "green"}>
                    {product.stock_quantity}
                  </Badge>
                </div>
              </div>
              <div className="p-3">
                <p className="line-clamp-2 min-h-10 text-sm font-black leading-tight">{product.name}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{product.sku}</p>
                <p className="mt-3 text-lg font-black text-caribbean-teal">{formatMoney(product.selling_price)}</p>
              </div>
            </button>
          ))}
          {!filteredProducts.length ? (
            <Panel className="grid min-h-64 place-items-center p-6 text-center sm:col-span-2 md:col-span-3 2xl:col-span-4">
              <div>
                <p className="text-lg font-black">No products yet.</p>
                <p className="mt-2 text-sm font-semibold text-slate-500">Add your first product in Inventory to start selling.</p>
              </div>
            </Panel>
          ) : null}
        </div>
      </div>

      <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-24">
        <Panel>
          <PanelHeader title="Cart" description={`${cart.length} items selected`} />
          <div className="max-h-[330px] overflow-auto">
            {cart.length ? (
              cart.map((item) => (
                <div key={item.id} className="grid gap-2 border-b border-caribbean-line p-3 dark:border-slate-800">
                  <div className="flex min-w-0 justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight">{item.name}</p>
                      <p className="text-xs font-semibold text-slate-500">{formatMoney(item.selling_price)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCart((current) => current.filter((entry) => entry.id !== item.id))}
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                    <div className="flex shrink-0 items-center rounded-card border border-caribbean-line dark:border-slate-700">
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, -1)}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="grid h-10 w-10 place-items-center text-sm font-black">
                        {item.quantity}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="font-black">{formatMoney(item.quantity * item.selling_price - item.discount)}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-sm font-semibold text-slate-500">Tap products to build the sale.</div>
            )}
          </div>
          <div className="grid gap-2 p-4">
            <Field
              label="Discount"
              type="number"
              min="0"
              step="0.01"
              value={discount}
              onChange={(event) => setDiscount(Number(event.target.value))}
            />
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><strong>{formatMoney(subtotal)}</strong></div>
              <div className="flex justify-between"><span>Discount</span><strong>-{formatMoney(discountTotal)}</strong></div>
              <div className="flex justify-between"><span>Tax/Fee</span><strong>{formatMoney(tax)}</strong></div>
              <div className="flex justify-between"><span>Delivery</span><strong>{formatMoney(deliveryFee)}</strong></div>
              <div className="mt-2 flex justify-between text-xl font-black">
                <span>Total</span><span>{formatMoney(total)}</span>
              </div>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Customer and fulfillment" />
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {[
                ["in_store", "In-store"],
                ["pickup", "Pickup"],
                ["delivery", "Delivery"]
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setOrderType(value as typeof orderType)}
                  className={`min-h-10 rounded-card px-2 py-2 text-sm font-black leading-tight ${
                    orderType === value
                      ? "bg-caribbean-teal text-white"
                      : "border border-caribbean-line bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Field label="Phone lookup" value={customer.phone} onChange={(event) => loadCustomerByPhone(event.target.value)} />
            <Field label="Customer name" value={customer.name} onChange={(event) => setCustomer({ ...customer, name: event.target.value })} />
            <Field label="Email" type="email" value={customer.email} onChange={(event) => setCustomer({ ...customer, email: event.target.value })} />
            {orderType === "delivery" ? (
              <div className="grid gap-3">
                <Field label="Street address" value={customer.street_address} onChange={(event) => setCustomer({ ...customer, street_address: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City/town" value={customer.city} onChange={(event) => setCustomer({ ...customer, city: event.target.value })} />
                  <Field label="Country" value={customer.country} onChange={(event) => setCustomer({ ...customer, country: event.target.value })} />
                </div>
                <Field label="Postal code optional" value={customer.postal_code} onChange={(event) => setCustomer({ ...customer, postal_code: event.target.value })} />
                <SelectField label={deliveryRegionLabel} value={customer.region} onChange={(event) => setCustomer({ ...customer, region: event.target.value })}>
                  {deliveryRegions.map((region) => <option key={region}>{region}</option>)}
                </SelectField>
                <TextAreaField label="Delivery instructions" value={customer.delivery_notes} onChange={(event) => setCustomer({ ...customer, delivery_notes: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Latitude" value={location.latitude} onChange={(event) => setLocation({ ...location, latitude: event.target.value })} />
                  <Field label="Longitude" value={location.longitude} onChange={(event) => setLocation({ ...location, longitude: event.target.value })} />
                </div>
                <Button type="button" onClick={captureLocation} disabled={locating}>
                  <LocateFixed className="h-4 w-4" />
                  {locating ? "Finding your location..." : "Use My Current Location"}
                </Button>
                {locationStatus ? <p className="text-xs font-bold text-caribbean-teal">{locationStatus}</p> : null}
                <Field label="Shared location link" value={location.link} onChange={(event) => setLocation({ ...location, link: event.target.value })} />
                <SelectField label="Assign driver" value={assignedDriver} onChange={(event) => setAssignedDriver(event.target.value)}>
                  <option value="">Unassigned</option>
                  {drivers.map((driver) => <option key={driver.id} value={driver.id}>{driver.name}</option>)}
                </SelectField>
              </div>
            ) : null}
            <label className="flex items-start gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={customer.marketing_consent}
                onChange={(event) => setCustomer({ ...customer, marketing_consent: event.target.checked })}
                className="mt-1"
              />
              Customer agrees to receive marketing messages and understands their data is stored for order history, delivery, loyalty, and receipts.
            </label>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Payment" />
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {enabledPaymentMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => {
                    setPaymentMethod(method);
                    setPaymentStatus(method === "Pay on delivery" ? "unpaid" : "paid");
                  }}
                  className={`min-h-12 rounded-card px-3 py-2 text-sm font-black leading-tight ${
                    paymentMethod === method
                      ? "bg-caribbean-teal text-white"
                      : "border border-caribbean-line bg-white dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            <SelectField label="Payment status" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
            </SelectField>
            {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
            <Button variant="primary" size="lg" onClick={completeSale} disabled={isSaving}>
              <Banknote className="h-4 w-4" />
              {isSaving ? "Completing sale..." : "Complete sale"}
            </Button>
          </div>
        </Panel>

        {lastOrder ? (
          <Panel>
            <PanelHeader title={`Receipt #${lastOrder.order_number}`} description="Sale saved, inventory and loyalty updated" />
            <div className="grid gap-3 p-4 text-sm">
              <div className="rounded-card bg-caribbean-cloud p-3 dark:bg-slate-950">
                <div className="flex justify-between"><span>Total</span><strong>{formatMoney(lastOrder.total)}</strong></div>
                <div className="flex justify-between"><span>Payment</span><strong>{lastOrder.payment_method}</strong></div>
                <div className="flex justify-between"><span>Loyalty earned</span><strong>{lastOrder.loyalty_points_earned}</strong></div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <Button variant="secondary" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  Print
                </Button>
                <a href={`/api/orders/${lastOrder.id}/receipt`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-bold leading-tight dark:border-slate-700 dark:bg-slate-900">
                  <ReceiptText className="h-4 w-4" />
                  PDF
                </a>
                <a href={`/api/orders/${lastOrder.id}/label`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-bold leading-tight dark:border-slate-700 dark:bg-slate-900">
                  <PackageCheck className="h-4 w-4" />
                  Label
                </a>
              </div>
              {lastOrder.payment_link ? (
                <a href={lastOrder.payment_link} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-mango px-3 py-2 text-center text-sm font-black leading-tight text-slate-950" rel="noreferrer">
                  <CreditCard className="h-4 w-4" />
                  Open payment link
                </a>
              ) : null}
              {lastOrder.whatsapp_business_link ? (
                <a href={lastOrder.whatsapp_business_link} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-caribbean-palm px-3 py-2 text-center text-sm font-black leading-tight text-white" rel="noreferrer">
                  <Send className="h-4 w-4" />
                  Send order to WhatsApp
                </a>
              ) : null}
              {lastOrder.whatsapp_customer_link ? (
                <a href={lastOrder.whatsapp_customer_link} target="_blank" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card border border-caribbean-line bg-white px-3 py-2 text-center text-sm font-black leading-tight dark:border-slate-700 dark:bg-slate-900" rel="noreferrer">
                  <CreditCard className="h-4 w-4" />
                  WhatsApp customer
                </a>
              ) : null}
            </div>
          </Panel>
        ) : null}
      </aside>
      {scannerOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-card border border-white/10 bg-slate-950 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 p-4">
              <div>
                <p className="text-lg font-black">Scan barcode</p>
                <p className="text-sm font-semibold text-slate-400">Point the camera at the product barcode.</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => setScannerOpen(false)} aria-label="Close scanner">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-3 p-4">
              <video ref={videoRef} className="aspect-video w-full rounded-card bg-black object-cover" muted playsInline />
              {scannerError ? (
                <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{scannerError}</p>
              ) : (
                <p className="rounded-card bg-teal-50 p-3 text-sm font-bold text-teal-800">
                  Camera scanner is active. The product will be added when a barcode is detected.
                </p>
              )}
              <Button variant="secondary" onClick={() => setScannerOpen(false)}>Close scanner</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
