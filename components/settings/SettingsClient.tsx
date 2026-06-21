"use client";

import Image from "next/image";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Bell,
  Building2,
  Copy,
  CreditCard,
  ExternalLink,
  GripVertical,
  Image as ImageIcon,
  LocateFixed,
  PlusCircle,
  Save,
  ShieldAlert,
  Store,
  Tags,
  Trash2,
  Truck,
  UserCog
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { detectCurrentAddress } from "@/lib/location-client";
import { CARIBBEAN_CURRENCIES, currencyOptionLabel, getDefaultDeliveryRatesForCurrency } from "@/lib/constants";
import { PLAN_CONFIG, PLAN_ORDER, canUseFeature, type PlanUsageSummary } from "@/lib/plan-gating";
import type { Business, Category, Settings, Subscription, User } from "@/lib/types";

const MAX_LOGO_SIZE_BYTES = 750 * 1024;
const LOGO_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/svg+xml"];
const LOGO_FILE_ACCEPT = "image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/*";
const THREE_D_THEMES = [
  { value: "caribbean", label: "Caribbean" },
  { value: "modern-retail", label: "Modern Retail" },
  { value: "cafe", label: "Cafe" },
  { value: "restaurant", label: "Restaurant" },
  { value: "grocery", label: "Grocery" },
  { value: "beauty", label: "Beauty" },
  { value: "clothing", label: "Clothing" }
];

const THREE_D_LIGHTING = [
  { value: "soft", label: "Soft premium" },
  { value: "bright", label: "Bright retail" },
  { value: "evening", label: "Evening glow" },
  { value: "gallery", label: "Gallery spotlight" }
];

const THREE_D_LAYOUTS = [
  { value: "shelves", label: "Product shelves" },
  { value: "islands", label: "Island displays" },
  { value: "gallery", label: "Gallery wall" },
  { value: "counter", label: "Counter service" }
];

const notificationTemplates = {
  received: "Hi {customer_name}, your order #{order_id} was received.",
  accepted: "Good news {customer_name}, your order #{order_id} was accepted.",
  preparing: "Your order is now being prepared.",
  outForDelivery: "Your order is out for delivery.",
  completed: "Your order has been completed. Thank you for shopping with {business_name}.",
  cancelled: "Your order #{order_id} was cancelled. Please contact us for more details."
};

type CategoryDeleteMode = "move_to_uncategorized" | "delete_category_only";

function Toggle({
  label,
  checked,
  onChange
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 min-w-0 items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.055] p-3 text-sm font-bold leading-tight text-teal-50">
      <span className="min-w-0">{label}</span>
      <input className="h-5 w-5 shrink-0 accent-cyan-300" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  id
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Panel id={id} className="scroll-mt-24">
      <PanelHeader
        title={title}
        description={description}
        action={
          <span className="grid h-10 w-10 place-items-center rounded-card border border-white/10 bg-cyan-300/10 text-cyan-100">
            <Icon className="h-5 w-5" />
          </span>
        }
      />
      <div className="grid gap-4 p-4 sm:p-5">{children}</div>
    </Panel>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Logo could not be read."));
    reader.readAsDataURL(file);
  });
}

function logoStoragePath(businessId: string | null | undefined, file: File) {
  const extension = (file.name.split(".").pop() || file.type.split("/").pop() || "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "png";
  return `business-logos/${businessId || "unassigned"}/logo-${Date.now()}.${extension}`;
}

async function validateLogoFile(file: File) {
  if (!LOGO_IMAGE_TYPES.includes(file.type)) return "Logo must be a PNG, JPG, WebP, or safe SVG image.";
  if (file.size > MAX_LOGO_SIZE_BYTES) return "Logo must be 750 KB or smaller.";
  if (file.type === "image/svg+xml") {
    const svg = await file.text();
    if (/<script|on\w+=|javascript:/i.test(svg)) return "SVG logo contains unsafe script content.";
  }
  return null;
}

function safeSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function SettingsClient({
  settings,
  staff,
  businesses,
  categories,
  subscription,
  planUsage
}: {
  settings: Settings;
  staff: User[];
  businesses: Business[];
  categories: Category[];
  subscription: Subscription | null;
  planUsage: PlanUsageSummary;
}) {
  const [draft, setDraft] = useState(settings);
  const takePhotoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [staffItems, setStaffItems] = useState(staff.filter((member) => member.role !== "kitchen"));
  const [categoryItems, setCategoryItems] = useState(categories);
  const [staffDraft, setStaffDraft] = useState({ name: "", email: "", phone: "", role: "cashier" });
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [categoryDraft, setCategoryDraft] = useState({ name: "", icon: "#", color: "#14b8a6", is_active: true });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] = useState<Category | null>(null);
  const [categoryDeleteMode, setCategoryDeleteMode] = useState<CategoryDeleteMode>("move_to_uncategorized");
  const [message, setMessage] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [whatsappTestMessage, setWhatsappTestMessage] = useState("");
  const [notificationTestMessage, setNotificationTestMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busyId, setBusyId] = useState("");
  const activeBusiness = businesses.find((business) => business.id === draft.active_business_id) || null;
  const storefrontSlug = activeBusiness?.storefront_slug || activeBusiness?.slug || "";
  const suggestedStorefrontSlug = storefrontSlug || safeSlug(draft.business_name);
  const storefrontUrl = storefrontSlug ? `/store/${storefrontSlug}` : "/settings";
  const threeDGate = canUseFeature(planUsage.planId, "threeDStorefront");
  const threeDPreviewUrl = storefrontSlug ? `${storefrontUrl}?view=3d-preview` : "/settings";
  const absoluteStorefrontUrl = useMemo(() => {
    if (!storefrontSlug) return "";
    if (typeof window === "undefined") return storefrontUrl;
    return new URL(storefrontUrl, window.location.origin).toString();
  }, [storefrontSlug, storefrontUrl]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateAddress(patch: Partial<Settings>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      const businessAddress = [
        next.business_street_address || next.business_address,
        next.business_city,
        next.business_region,
        next.business_country
      ].filter(Boolean).join(", ");
      return { ...next, business_address: businessAddress };
    });
  }

  async function saveSettings(successMessage = "Settings saved.") {
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = await readApiPayload<{ settings: Settings }>(response);
      if (!response.ok || !payload.data?.settings) {
        setMessage(payload.error || "Settings could not be saved.");
        return false;
      }
      setDraft(payload.data.settings);
      setMessage(successMessage);
      return true;
    } catch {
      setMessage("Settings could not be saved. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function useCurrentLocation() {
    setLocationMessage("Finding your location...");
    setLocating(true);
    try {
      const { address } = await detectCurrentAddress();
      updateAddress({
        business_street_address: address.street || address.formatted,
        business_city: address.city,
        business_region: address.region,
        business_country: address.country || "Trinidad and Tobago",
        business_postal_code: address.postalCode,
        business_latitude: address.lat,
        business_longitude: address.lng
      });
      setLocationMessage("Address added. Review it before saving.");
    } catch (error) {
      setLocationMessage(error instanceof Error ? error.message : "Location could not be detected. Enter the address manually.");
    } finally {
      setLocating(false);
    }
  }

  async function uploadLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const validationError = await validateLogoFile(file);
    if (validationError) {
      setMessage(validationError);
      return;
    }
    try {
      const logoUrl = await readFileAsDataUrl(file);
      const businessId = draft.active_business_id || null;
      setDraft((current) => ({
        ...current,
        logo_url: logoUrl,
        logo_storage_path: logoStoragePath(current.active_business_id || businessId, file)
      }));
      setMessage("Logo ready. Save changes to apply it to this business only.");
    } catch {
      setMessage("Logo could not be uploaded.");
    }
  }

  function removeLogo() {
    setDraft((current) => ({ ...current, logo_url: null, logo_storage_path: null }));
    setMessage("Logo removed. Save changes to apply it.");
  }

  async function copyStorefrontLink() {
    try {
      if (!absoluteStorefrontUrl) {
        setMessage("Complete your business profile to publish your storefront.");
        return;
      }
      await navigator.clipboard.writeText(absoluteStorefrontUrl);
      setMessage("Storefront link copied.");
    } catch {
      setMessage("Copy failed. Open the storefront and copy the browser link.");
    }
  }

  async function sendWhatsAppTest(testMode = false) {
    setWhatsappTestMessage(testMode ? "Validating Twilio WhatsApp setup..." : "Sending test WhatsApp message...");
    setBusyId(testMode ? "whatsapp-test-mode" : "whatsapp-test-send");
    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.whatsapp_business_number,
          message: `Test WhatsApp message from ${draft.business_name}.`,
          testMode
        })
      });
      const payload = await readApiPayload<{ result: { ok: boolean; message: string; skipped?: boolean } }>(response);
      if (!response.ok) {
        setWhatsappTestMessage(payload.error || "WhatsApp test failed.");
        return;
      }
      setWhatsappTestMessage(payload.data?.result?.message || "WhatsApp test completed.");
    } catch {
      setWhatsappTestMessage("WhatsApp test failed. Check the server connection and try again.");
    } finally {
      setBusyId("");
    }
  }


  async function testOrderNotification() {
    setNotificationTestMessage("");
    if (draft.new_order_browser_notifications_enabled && !("Notification" in window)) {
      setNotificationTestMessage("Browser notifications are not supported in this browser.");
      return;
    }
    if (draft.new_order_browser_notifications_enabled && Notification.permission === "default") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setNotificationTestMessage("Browser notification permission was not granted. Visual alerts will still work.");
        return;
      }
    }
    if (draft.new_order_browser_notifications_enabled && Notification.permission === "denied") {
      setNotificationTestMessage("Browser notifications are blocked. Enable them in your browser settings to receive desktop alerts.");
      return;
    }
    if (draft.new_order_browser_notifications_enabled && Notification.permission === "granted") {
      new Notification("New order received", { body: "Test notification from Caribbean POS Connect." });
    }
    setNotificationTestMessage("Test notification ready. Live visual alerts will appear when a new order arrives.");
  }
  async function saveStaff() {
    setStaffMessage("");
    const payload = {
      name: staffDraft.name,
      email: staffDraft.email,
      phone: staffDraft.phone || null,
      role: staffDraft.role,
      active: true
    };
    const url = editingStaffId ? `/api/staff/${editingStaffId}` : "/api/staff";
    const method = editingStaffId ? "PATCH" : "POST";
    setBusyId(editingStaffId || "new-staff");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readApiPayload<{ staff: User }>(response);
      if (!response.ok || !result.data?.staff) {
        setStaffMessage(result.error || "Staff profile could not be saved.");
        return;
      }
      setStaffItems((current) => editingStaffId
        ? current.map((member) => (member.id === editingStaffId ? result.data!.staff : member))
        : [result.data!.staff, ...current]);
      setStaffDraft({ name: "", email: "", phone: "", role: "cashier" });
      setEditingStaffId(null);
      setStaffMessage("Staff profile saved.");
    } catch {
      setStaffMessage("Staff profile could not be saved. Check your connection.");
    } finally {
      setBusyId("");
    }
  }

  function editStaff(member: User) {
    setEditingStaffId(member.id);
    setStaffDraft({
      name: member.name,
      email: member.email,
      phone: member.phone || "",
      role: member.role === "kitchen" ? "cashier" : member.role
    });
  }

  async function deleteStaff(member: User) {
    if (!window.confirm(`Delete ${member.name}?`)) return;
    setBusyId(member.id);
    setStaffMessage("");
    try {
      const response = await fetch(`/api/staff/${member.id}`, { method: "DELETE" });
      const result = await readApiPayload<{ staff: User }>(response);
      if (!response.ok) {
        setStaffMessage(result.error || "Staff profile could not be deleted.");
        return;
      }
      setStaffItems((current) => current.filter((item) => item.id !== member.id));
      setStaffMessage("Staff profile deleted.");
    } catch {
      setStaffMessage("Staff profile could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  async function saveCategory() {
    setCategoryMessage("");
    const payload = {
      name: categoryDraft.name,
      icon: categoryDraft.icon,
      color: categoryDraft.color,
      sort_order: editingCategoryId
        ? categoryItems.find((item) => item.id === editingCategoryId)?.sort_order || 0
        : categoryItems.length,
      is_active: categoryDraft.is_active,
      active: categoryDraft.is_active
    };
    const url = editingCategoryId ? `/api/categories/${editingCategoryId}` : "/api/categories";
    const method = editingCategoryId ? "PATCH" : "POST";
    setBusyId(editingCategoryId || "new-category");
    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const result = await readApiPayload<{ category: Category }>(response);
      if (!response.ok || !result.data?.category) {
        setCategoryMessage(result.error || "Category could not be saved.");
        return;
      }
      setCategoryItems((current) => editingCategoryId
        ? current.map((item) => (item.id === editingCategoryId ? result.data!.category : item))
        : [...current, result.data!.category].sort((a, b) => a.sort_order - b.sort_order));
      setCategoryDraft({ name: "", icon: "#", color: "#14b8a6", is_active: true });
      setEditingCategoryId(null);
      setCategoryMessage(editingCategoryId ? "Category updated." : "Category added.");
    } catch {
      setCategoryMessage("Category could not be saved.");
    } finally {
      setBusyId("");
    }
  }

  function editCategory(category: Category) {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      icon: category.icon || "#",
      color: category.color || "#14b8a6",
      is_active: category.is_active !== false && category.active !== false
    });
  }

  async function toggleCategory(category: Category) {
    const nextActive = !(category.is_active !== false && category.active !== false);
    setBusyId(category.id);
    setCategoryMessage("");
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive, active: nextActive })
      });
      const result = await readApiPayload<{ category: Category }>(response);
      if (!response.ok || !result.data?.category) {
        setCategoryMessage(result.error || "Category status could not be updated.");
        return;
      }
      setCategoryItems((current) => current.map((item) => (item.id === category.id ? result.data!.category : item)));
      setCategoryMessage(nextActive ? "Category shown." : "Category hidden.");
    } catch {
      setCategoryMessage("Category status could not be updated.");
    } finally {
      setBusyId("");
    }
  }

  async function confirmDeleteCategory() {
    if (!categoryDeleteTarget) return;
    const category = categoryDeleteTarget;
    setBusyId(category.id);
    setCategoryMessage("");
    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: categoryDeleteMode })
      });
      const result = await readApiPayload<{ category: Category; mode: CategoryDeleteMode }>(response);
      if (!response.ok) {
        setCategoryMessage(result.error || "Category could not be deleted.");
        return;
      }
      setCategoryItems((current) => current.filter((item) => item.id !== category.id));
      setCategoryDeleteTarget(null);
      setCategoryDeleteMode("move_to_uncategorized");
      setCategoryMessage(categoryDeleteMode === "move_to_uncategorized" ? "Category deleted. Items moved to Uncategorized." : "Category deleted.");
    } catch {
      setCategoryMessage("Category could not be deleted.");
    } finally {
      setBusyId("");
    }
  }

  async function moveCategory(category: Category, direction: -1 | 1) {
    const index = categoryItems.findIndex((item) => item.id === category.id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= categoryItems.length) return;
    const nextItems = [...categoryItems];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    const reordered = nextItems.map((entry, sort_order) => ({ ...entry, sort_order }));
    setCategoryItems(reordered);
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reorder",
          categories: reordered.map(({ id, sort_order }) => ({ id, sort_order }))
        })
      });
      const result = await readApiPayload<{ categories: Category[] }>(response);
      if (!response.ok) {
        setCategoryMessage(result.error || "Category order could not be saved.");
        return;
      }
      if (result.data?.categories) setCategoryItems(result.data.categories);
      setCategoryMessage("Category order updated.");
    } catch {
      setCategoryMessage("Category order could not be saved.");
    }
  }

  function resetDanger(action: string) {
    if (!window.confirm(`${action}? This action needs confirmation.`)) return;
    setMessage(`${action} is not automated from this screen yet. Contact support before changing live business data.`);
  }

  return (
    <div className="mx-auto grid w-full max-w-[1180px] gap-5 pb-4">
      <section className="rounded-card border border-white/10 bg-white/[0.05] p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-white">Settings</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-teal-50/65 sm:text-base">
              Manage your business, storefront, team, payments, notifications, and subscription.
            </p>
          </div>
          {message ? <p className="rounded-card border border-cyan-200/20 bg-cyan-300/10 px-3 py-2 text-sm font-black text-cyan-100">{message}</p> : null}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <SettingsCard icon={Building2} title="Business Profile" description="Core business details used on the dashboard, storefront, receipts, and orders.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" value={draft.business_name} onChange={(event) => update("business_name", event.target.value)} />
            <SelectField label="Business type" value={draft.business_type || "retail"} onChange={(event) => update("business_type", event.target.value)}>
              <option value="retail">Retail / food business</option>
              <option value="restaurant">Restaurant</option>
              <option value="vendor">Food vendor</option>
              <option value="delivery">Delivery business</option>
            </SelectField>
            <Field label="Phone number" value={draft.business_phone} onChange={(event) => update("business_phone", event.target.value)} />
            <Field label="WhatsApp number" value={draft.whatsapp_business_number} onChange={(event) => update("whatsapp_business_number", event.target.value)} />
            <Field label="Email" type="email" value={draft.business_email} onChange={(event) => update("business_email", event.target.value)} />
            <Field label="Country" value={draft.business_country || "Trinidad and Tobago"} onChange={(event) => updateAddress({ business_country: event.target.value })} />
            <Field label="Store address" value={draft.business_street_address || draft.business_address || ""} onChange={(event) => updateAddress({ business_street_address: event.target.value })} className="sm:col-span-2" />
            <Field label="City / region" value={draft.business_city || draft.business_region || ""} onChange={(event) => updateAddress({ business_city: event.target.value, business_region: event.target.value })} />
            <SelectField label="Store currency" value={draft.currency || "TTD"} onChange={(event) => update("currency", event.target.value)}>
              {CARIBBEAN_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>{currencyOptionLabel(currency)}</option>
              ))}
            </SelectField>
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button type="button" onClick={useCurrentLocation} disabled={locating || saving} className="w-full sm:w-auto">
              <LocateFixed className="h-4 w-4" />
              {locating ? "Finding location..." : "Use My Current Location"}
            </Button>
            <Button type="button" variant="primary" onClick={() => saveSettings("Business profile saved.")} disabled={saving} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
          {locationMessage ? <p className="text-sm font-bold text-teal-50/60">{locationMessage}</p> : null}
        </SettingsCard>

        <SettingsCard icon={Store} title="Storefront Settings" description="Public storefront identity, order channels, and customer-facing controls.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Storefront name" value={draft.business_name} onChange={(event) => update("business_name", event.target.value)} />
            <Field label="Storefront slug/link" value={storefrontSlug || suggestedStorefrontSlug || "Complete business profile first"} readOnly />
            <SelectField label="Storefront status" value={draft.storefront_status || "live"} onChange={(event) => update("storefront_status", event.target.value)}>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </SelectField>
            <Field label="Store hours" value={draft.store_hours || ""} onChange={(event) => update("store_hours", event.target.value)} />
            <Toggle label="Delivery available" checked={draft.delivery_enabled !== false} onChange={(value) => update("delivery_enabled", value)} />
            <Toggle label="Pickup available" checked={draft.pickup_enabled !== false} onChange={(value) => update("pickup_enabled", value)} />
            <Toggle label="Show empty categories" checked={Boolean(draft.show_empty_categories)} onChange={(value) => update("show_empty_categories", value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <a href={storefrontUrl} target={storefrontSlug ? "_blank" : undefined} aria-disabled={!storefrontSlug} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-4 text-sm font-black text-white transition hover:bg-white/[0.12] aria-disabled:pointer-events-none aria-disabled:opacity-50">
              <ExternalLink className="h-4 w-4" />
              Open storefront
            </a>
            <Button type="button" onClick={copyStorefrontLink} className="w-full">
              <Copy className="h-4 w-4" />
              Copy link
            </Button>
            <Button type="button" variant="primary" onClick={() => saveSettings("Storefront settings saved.")} disabled={saving} className="w-full">
              <Save className="h-4 w-4" />
              Save
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard icon={Store} title="3D Storefront" description="Premium virtual storefront mode for customers who want an immersive product view.">
          <div className="grid gap-4">
            <div className="rounded-card border border-cyan-200/15 bg-cyan-300/[0.06] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-black text-white">Optional premium 3D shopping experience</p>
                  <p className="mt-1 text-sm font-semibold leading-6 text-teal-50/60">
                    Customers still keep the normal storefront and checkout. The 3D store loads only when they choose Enter 3D Store.
                  </p>
                </div>
                <Badge tone={threeDGate.allowed ? "green" : "amber"}>{threeDGate.allowed ? "Unlocked" : "Premium"}</Badge>
              </div>
              {!threeDGate.allowed ? (
                <p className="mt-3 rounded-card border border-amber-300/20 bg-amber-300/10 p-3 text-sm font-bold text-amber-100">
                  Upgrade to Premium to publish 3D storefront mode. You can still preview the setup and keep the normal storefront live.
                </p>
              ) : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Toggle
                label="Enable 3D Storefront"
                checked={Boolean(draft.storefront_3d_enabled) && threeDGate.allowed}
                onChange={(value) => update("storefront_3d_enabled", threeDGate.allowed ? value : false)}
              />
              <SelectField label="Store theme style" value={draft.storefront_3d_theme || "caribbean"} onChange={(event) => update("storefront_3d_theme", event.target.value)}>
                {THREE_D_THEMES.map((theme) => <option key={theme.value} value={theme.value}>{theme.label}</option>)}
              </SelectField>
              <SelectField label="Lighting option" value={draft.storefront_3d_lighting || "soft"} onChange={(event) => update("storefront_3d_lighting", event.target.value)}>
                {THREE_D_LIGHTING.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </SelectField>
              <SelectField label="Product display layout" value={draft.storefront_3d_layout || "shelves"} onChange={(event) => update("storefront_3d_layout", event.target.value)}>
                {THREE_D_LAYOUTS.map((layout) => <option key={layout.value} value={layout.value}>{layout.label}</option>)}
              </SelectField>
              <Field label="Background color" value={draft.storefront_3d_background || "#071421"} onChange={(event) => update("storefront_3d_background", event.target.value)} />
              <Field label="Hero/banner image" value={draft.storefront_banner_url || ""} onChange={(event) => update("storefront_banner_url", event.target.value)} />
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <a href={threeDPreviewUrl} target={storefrontSlug ? "_blank" : undefined} aria-disabled={!storefrontSlug} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-cyan-200/20 bg-white/[0.07] px-4 text-sm font-black text-white transition hover:bg-white/[0.12] aria-disabled:pointer-events-none aria-disabled:opacity-50">
                <ExternalLink className="h-4 w-4" />
                Preview 3D storefront
              </a>
              <Button type="button" variant="primary" onClick={() => saveSettings("3D storefront settings saved.")} disabled={saving} className="w-full sm:w-auto">
                <Save className="h-4 w-4" />
                Save 3D settings
              </Button>
              {!threeDGate.allowed ? <a href="/subscription" className="inline-flex min-h-10 items-center justify-center rounded-card bg-amber-300 px-4 text-sm font-black text-slate-950">Upgrade plan</a> : null}
            </div>
          </div>
        </SettingsCard>
        <SettingsCard id="whatsapp" icon={Bell} title="Order Notifications" description="Automatic customer updates connected to order status changes.">
                    <div className="grid gap-3 rounded-card border border-cyan-200/15 bg-cyan-300/[0.06] p-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/65">Admin new order alerts</p>
            <Toggle label="Enable new order alerts" checked={draft.new_order_alerts_enabled !== false} onChange={(value) => update("new_order_alerts_enabled", value)} />
            <Toggle label="Play sound for new orders" checked={draft.new_order_sound_enabled !== false} onChange={(value) => update("new_order_sound_enabled", value)} />
            <Toggle label="Enable browser notifications" checked={Boolean(draft.new_order_browser_notifications_enabled)} onChange={(value) => update("new_order_browser_notifications_enabled", value)} />
            <Toggle label="Show order preview in alert" checked={draft.new_order_alert_preview_enabled !== false} onChange={(value) => update("new_order_alert_preview_enabled", value)} />
            <Button type="button" onClick={testOrderNotification} className="w-full sm:w-auto">
              Test notification
            </Button>
            {notificationTestMessage ? (
              <p className="rounded-card border border-white/10 bg-black/20 p-3 text-sm font-bold text-teal-50/70">{notificationTestMessage}</p>
            ) : null}
          </div><div className="grid gap-3">
            <Toggle label="Send WhatsApp message when order is received" checked={draft.whatsapp_customer_confirmations_enabled} onChange={(value) => update("whatsapp_customer_confirmations_enabled", value)} />
            <Toggle label="Send message when order is accepted" checked={draft.notification_whatsapp_enabled} onChange={(value) => update("notification_whatsapp_enabled", value)} />
            <Toggle label="Send message when order is preparing" checked={draft.notification_whatsapp_enabled} onChange={(value) => update("notification_whatsapp_enabled", value)} />
            <Toggle label="Send message when order is out for delivery" checked={draft.whatsapp_out_for_delivery_enabled} onChange={(value) => update("whatsapp_out_for_delivery_enabled", value)} />
            <Toggle label="Send message when order is completed" checked={draft.whatsapp_customer_receipts_enabled} onChange={(value) => update("whatsapp_customer_receipts_enabled", value)} />
            <Toggle label="Send message when order is cancelled" checked={draft.notification_whatsapp_enabled} onChange={(value) => update("notification_whatsapp_enabled", value)} />
          </div>
          <div className="grid gap-4">
            <TextAreaField label="Order received template" value={draft.whatsapp_customer_confirmation_template || notificationTemplates.received} onChange={(event) => update("whatsapp_customer_confirmation_template", event.target.value)} />
            <TextAreaField label="Preparing / delivery template" value={draft.whatsapp_out_for_delivery_template || notificationTemplates.outForDelivery} onChange={(event) => update("whatsapp_out_for_delivery_template", event.target.value)} />
            <TextAreaField label="Completed receipt template" value={draft.whatsapp_customer_receipt_template || notificationTemplates.completed} onChange={(event) => update("whatsapp_customer_receipt_template", event.target.value)} />
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap">
            <Button type="button" variant="primary" onClick={() => saveSettings("Notification settings saved.")} disabled={saving} className="w-full sm:w-auto">
              <Save className="h-4 w-4" />
              Save notifications
            </Button>
            <Button type="button" onClick={() => sendWhatsAppTest(true)} disabled={Boolean(busyId)} className="w-full sm:w-auto">
              {busyId === "whatsapp-test-mode" ? "Validating..." : "Test mode"}
            </Button>
            <Button type="button" onClick={() => sendWhatsAppTest(false)} disabled={Boolean(busyId) || !draft.whatsapp_business_number.trim()} className="w-full sm:w-auto">
              {busyId === "whatsapp-test-send" ? "Sending..." : "Send test message"}
            </Button>
          </div>
          {whatsappTestMessage ? (
            <p className="rounded-card border border-white/10 bg-black/20 p-3 text-sm font-bold text-teal-50/70">{whatsappTestMessage}</p>
          ) : null}
        </SettingsCard>

        <SettingsCard icon={UserCog} title="Team / Staff" description="Add, edit, and remove staff accounts for this business.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Staff name" value={staffDraft.name} onChange={(event) => setStaffDraft((current) => ({ ...current, name: event.target.value }))} />
            <SelectField label="Staff role" value={staffDraft.role} onChange={(event) => setStaffDraft((current) => ({ ...current, role: event.target.value }))}>
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
              <option value="cashier">Cashier</option>
              <option value="driver">Driver</option>
            </SelectField>
            <Field label="Staff email" type="email" value={staffDraft.email} onChange={(event) => setStaffDraft((current) => ({ ...current, email: event.target.value }))} />
            <Field label="Phone optional" value={staffDraft.phone} onChange={(event) => setStaffDraft((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <Button type="button" variant="primary" onClick={saveStaff} disabled={!staffDraft.name.trim() || !staffDraft.email.trim() || Boolean(busyId)} className="w-full sm:w-auto">
            <PlusCircle className="h-4 w-4" />
            {editingStaffId ? "Save staff" : "Add staff"}
          </Button>
          {staffMessage ? <p className="text-sm font-bold text-teal-50/60">{staffMessage}</p> : null}
          <div className="grid gap-3">
            {staffItems.map((member) => (
              <div key={member.id} className="grid gap-3 rounded-card border border-white/10 bg-black/20 p-3 sm:flex sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="font-black text-white">{member.name}</p>
                  <p className="text-xs font-semibold text-teal-50/55">{member.email || member.phone}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge tone={member.role === "owner" || member.role === "admin" ? "teal" : "green"}>{member.role === "admin" ? "Owner" : member.role}</Badge>
                  <Button type="button" size="sm" onClick={() => editStaff(member)}>Edit</Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => deleteStaff(member)} disabled={busyId === member.id}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SettingsCard>

        <SettingsCard icon={Tags} title="Categories" description="Manage POS and storefront item groups. Changes update products, POS filters, item forms, and storefront categories.">
          <div className="grid gap-4 sm:grid-cols-[1fr_80px_120px]">
            <Field label="Category name" value={categoryDraft.name} onChange={(event) => setCategoryDraft((current) => ({ ...current, name: event.target.value }))} />
            <Field label="Icon" value={categoryDraft.icon} onChange={(event) => setCategoryDraft((current) => ({ ...current, icon: event.target.value }))} />
            <Field label="Color" value={categoryDraft.color} onChange={(event) => setCategoryDraft((current) => ({ ...current, color: event.target.value }))} />
          </div>
          <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            <Toggle label="Active in POS and storefront" checked={categoryDraft.is_active} onChange={(value) => setCategoryDraft((current) => ({ ...current, is_active: value }))} />
            <Button type="button" variant="primary" onClick={saveCategory} disabled={!categoryDraft.name.trim() || Boolean(busyId)} className="w-full sm:w-auto">
              <PlusCircle className="h-4 w-4" />
              {busyId === (editingCategoryId || "new-category") ? "Saving..." : editingCategoryId ? "Save category" : "Add category"}
            </Button>
            {editingCategoryId ? (
              <Button type="button" onClick={() => { setEditingCategoryId(null); setCategoryDraft({ name: "", icon: "#", color: "#14b8a6", is_active: true }); }} className="w-full sm:w-auto">
                Cancel edit
              </Button>
            ) : null}
          </div>
          {categoryMessage ? <p className="text-sm font-bold text-teal-50/60">{categoryMessage}</p> : null}
          <div className="grid gap-3">
            {!categoryItems.length ? (
              <p className="rounded-card border border-white/10 bg-black/20 p-4 text-sm font-bold text-teal-50/60">
                No categories yet. Add one above to use it in POS, inventory, and storefront.
              </p>
            ) : null}
            {categoryItems.map((category) => (
              <div key={category.id} className="grid gap-3 rounded-card border border-white/10 bg-black/20 p-3 sm:flex sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <GripVertical className="h-4 w-4 text-teal-50/35" />
                  <span className="grid h-9 w-9 place-items-center rounded-card border border-white/10" style={{ backgroundColor: category.color || "#14b8a6" }}>{category.icon || "â€¢"}</span>
                  <div className="min-w-0">
                    <p className="font-black text-white">{category.name}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone={category.is_active !== false && category.active !== false ? "green" : "neutral"}>
                        {category.is_active !== false && category.active !== false ? "Active" : "Hidden"}
                      </Badge>
                      <span className="text-xs font-semibold text-teal-50/50">Sort {category.sort_order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={() => moveCategory(category, -1)}>Up</Button>
                  <Button type="button" size="sm" onClick={() => moveCategory(category, 1)}>Down</Button>
                  <Button type="button" size="sm" onClick={() => editCategory(category)}>Edit</Button>
                  <Button type="button" size="sm" onClick={() => toggleCategory(category)} disabled={busyId === category.id}>
                    {category.is_active !== false && category.active !== false ? "Hide" : "Show"}
                  </Button>
                  <Button type="button" size="sm" variant="danger" onClick={() => { setCategoryDeleteTarget(category); setCategoryDeleteMode("move_to_uncategorized"); }} disabled={busyId === category.id}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {categoryDeleteTarget ? (
            <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
              <div className="w-full max-w-lg rounded-card border border-white/10 bg-slate-950 p-5 shadow-2xl">
                <h3 className="text-lg font-black text-white">Are you sure you want to delete this category?</h3>
                <p className="mt-2 text-sm font-semibold text-teal-50/60">
                  {categoryDeleteTarget.name} will be removed from category lists. Products will not be deleted.
                </p>
                <div className="mt-4 grid gap-3">
                  <label className="flex items-start gap-3 rounded-card border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white">
                    <input type="radio" checked={categoryDeleteMode === "move_to_uncategorized"} onChange={() => setCategoryDeleteMode("move_to_uncategorized")} className="mt-1" />
                    <span>Move items in this category to Uncategorized</span>
                  </label>
                  <label className="flex items-start gap-3 rounded-card border border-white/10 bg-white/[0.06] p-3 text-sm font-bold text-white">
                    <input type="radio" checked={categoryDeleteMode === "delete_category_only"} onChange={() => setCategoryDeleteMode("delete_category_only")} className="mt-1" />
                    <span>Delete category only</span>
                  </label>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <Button type="button" onClick={() => setCategoryDeleteTarget(null)} disabled={Boolean(busyId)}>Cancel</Button>
                  <Button type="button" variant="danger" onClick={confirmDeleteCategory} disabled={busyId === categoryDeleteTarget.id}>
                    <Trash2 className="h-4 w-4" />
                    {busyId === categoryDeleteTarget.id ? "Deleting..." : "Delete category"}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SettingsCard>

        <SettingsCard icon={CreditCard} title="Currency & Payments" description="Store currency, customer conversion display, accepted methods, and payment instructions.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Cash" checked={draft.payment_cash_enabled} onChange={(value) => update("payment_cash_enabled", value)} />
            <Toggle label="Card" checked={draft.payment_card_enabled} onChange={(value) => update("payment_card_enabled", value)} />
            <Toggle label="Bank transfer" checked={draft.payment_bank_enabled} onChange={(value) => update("payment_bank_enabled", value)} />
            <Toggle label="WiPay" checked={draft.payment_wipay_enabled} onChange={(value) => update("payment_wipay_enabled", value)} />
            <Toggle label="PayPal" checked={draft.payment_paypal_enabled} onChange={(value) => update("payment_paypal_enabled", value)} />
            <Toggle label="Payment required before fulfillment" checked={!draft.payment_pod_enabled} onChange={(value) => update("payment_pod_enabled", !value)} />
            <Toggle label="Use live currency conversion" checked={Boolean(draft.use_live_currency_conversion)} onChange={(value) => update("use_live_currency_conversion", value)} />
            <Toggle label="Display converted customer currency" checked={Boolean(draft.display_converted_customer_currency)} onChange={(value) => update("display_converted_customer_currency", value)} />
            <SelectField label="Store base currency" value={draft.base_currency || draft.currency || "TTD"} onChange={(event) => update("base_currency", event.target.value)}>
              {CARIBBEAN_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>{currencyOptionLabel(currency)}</option>
              ))}
            </SelectField>
            <SelectField label="Customer display currency" value={draft.customer_display_currency || "USD"} onChange={(event) => update("customer_display_currency", event.target.value)}>
              {CARIBBEAN_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>{currencyOptionLabel(currency)}</option>
              ))}
            </SelectField>
          </div>
          <p className="rounded-card border border-white/10 bg-black/20 p-3 text-sm font-semibold text-teal-50/60">Preview: 100 {draft.base_currency || draft.currency || "TTD"} converts through the backend exchange-rate cache when EXCHANGE_RATE_API_KEY is configured.</p>
          <TextAreaField label="Manual payment instructions" value={draft.payment_link_template} onChange={(event) => update("payment_link_template", event.target.value)} />
          <Button type="button" variant="primary" onClick={() => saveSettings("Payment settings saved.")} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save payments
          </Button>
        </SettingsCard>

        <SettingsCard icon={Truck} title="Delivery / Waze" description="Delivery pricing and navigation settings for drivers.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle label="Enable delivery" checked={draft.delivery_enabled !== false} onChange={(value) => update("delivery_enabled", value)} />
            <Field label="Default delivery fee" type="number" value={draft.delivery_fee} onChange={(event) => update("delivery_fee", Number(event.target.value))} />
            <Field label="Free delivery minimum" type="number" value={draft.free_delivery_minimum || 0} onChange={(event) => update("free_delivery_minimum", Number(event.target.value))} />
            <Toggle label="Waze navigation enabled" checked={draft.waze_enabled !== false} onChange={(value) => update("waze_enabled", value)} />
            <Toggle label="Driver can open customer address in Waze" checked={draft.driver_waze_enabled !== false} onChange={(value) => update("driver_waze_enabled", value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.entries(draft.delivery_rates || getDefaultDeliveryRatesForCurrency(draft.currency)).slice(0, 8).map(([region, value]) => (
              <Field
                key={region}
                label={region}
                type="number"
                value={value}
                onChange={(event) => update("delivery_rates", { ...(draft.delivery_rates || {}), [region]: Number(event.target.value) })}
              />
            ))}
          </div>
          <Button type="button" variant="primary" onClick={() => saveSettings("Delivery settings saved.")} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save delivery
          </Button>
        </SettingsCard>

        <SettingsCard icon={CreditCard} title="Subscription / Billing" description="Plan controls for selling Caribbean POS Connect as a SaaS product.">
          <div className="grid gap-3">
            <div className="rounded-card border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-bold text-teal-50/60">Current plan</p>
              <p className="mt-1 text-2xl font-black text-white">{subscription?.plan_name || "Starter"}</p>
              <p className="mt-1 text-sm font-semibold text-teal-50/60">Status: {subscription?.status || "trial"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {PLAN_ORDER.map((planId) => {
                const plan = PLAN_CONFIG[planId];
                return (
                <div key={plan.id} className="rounded-card border border-white/10 bg-white/[0.045] p-3">
                  <p className="font-black text-white">{plan.name.replace(" Plan", "")}</p>
                  <p className="mt-1 text-sm font-semibold text-teal-50/55">
                    {plan.id === "trial" ? "Free trial" : plan.monthlyPrice ? `${plan.currency}${plan.monthlyPrice}/mo` : "Custom"}
                  </p>
                </div>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {planUsage.meters.map((meter) => (
                <div key={meter.key} className="rounded-card border border-white/10 bg-black/20 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-white">{meter.label}</p>
                    <Badge tone={meter.locked ? "amber" : meter.limit === null ? "green" : "neutral"}>
                      {meter.locked ? "Locked" : meter.limit === null ? "Unlimited" : `${meter.used}/${meter.limit}`}
                    </Badge>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10">
                    <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${meter.limit === null ? 100 : meter.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:flex sm:flex-wrap">
              <a href="/subscription" className="inline-flex min-h-10 items-center justify-center rounded-card bg-cyan-300 px-4 text-sm font-black text-slate-950">Upgrade plan</a>
              <Button type="button" variant="danger" onClick={() => resetDanger("Cancel subscription")} className="w-full sm:w-auto">Cancel subscription</Button>
            </div>
            <p className="rounded-card border border-white/10 bg-black/20 p-3 text-sm font-semibold text-teal-50/60">Billing history will appear here when payment processing is connected.</p>
          </div>
        </SettingsCard>

        <SettingsCard icon={ImageIcon} title="Appearance / Branding" description="Customize storefront, receipt, and business visuals.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-card border border-white/10 bg-black/20 p-4">
              <Image
                src={draft.logo_url || "/caribbean-pos-connect-icon.png"}
                alt=""
                width={64}
                height={64}
                unoptimized={Boolean(draft.logo_url?.startsWith("data:"))}
                className="h-16 w-16 rounded-card bg-white object-contain p-2"
              />
              <div className="mt-4 grid gap-2">
                <input ref={takePhotoInputRef} type="file" accept={LOGO_FILE_ACCEPT} capture="environment" className="sr-only" onChange={uploadLogo} aria-label="Take business logo photo" />
                <input ref={photoInputRef} type="file" accept={LOGO_FILE_ACCEPT} className="sr-only" onChange={uploadLogo} aria-label="Choose business logo from photos" />
                <input ref={fileInputRef} type="file" accept={LOGO_FILE_ACCEPT} className="sr-only" onChange={uploadLogo} aria-label="Browse files for business logo" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Button type="button" onClick={() => takePhotoInputRef.current?.click()} className="w-full">Take Photo</Button>
                  <Button type="button" onClick={() => photoInputRef.current?.click()} className="w-full">Choose Photos</Button>
                  <Button type="button" onClick={() => fileInputRef.current?.click()} className="w-full">Browse Files</Button>
                </div>
                {draft.logo_url ? (
                  <Button type="button" variant="danger" onClick={removeLogo} className="w-full sm:w-auto">
                    Remove logo
                  </Button>
                ) : null}
                <p className="text-xs font-semibold leading-5 text-teal-50/55">PNG, JPG, WebP, or safe SVG. Maximum 750 KB. Camera capture is only used for Take Photo.</p>
              </div>
            </div>
            <div className="grid gap-4">
              <Field label="Business color" value={draft.business_color || "#14b8a6"} onChange={(event) => update("business_color", event.target.value)} />
              <Field label="Storefront banner" value={draft.storefront_banner_url || ""} onChange={(event) => update("storefront_banner_url", event.target.value)} />
            </div>
          </div>
          <TextAreaField label="Receipt footer message" value={draft.receipt_message} onChange={(event) => update("receipt_message", event.target.value)} />
          <Button type="button" variant="primary" onClick={() => saveSettings("Branding settings saved.")} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save branding
          </Button>
        </SettingsCard>

        <SettingsCard icon={ShieldAlert} title="Danger Zone" description="High-risk business data actions. Confirmation is required.">
          <div className="grid gap-3 sm:grid-cols-3">
            <Button type="button" variant="danger" onClick={() => resetDanger("Delete test data")} className="w-full">
              <Trash2 className="h-4 w-4" />
              Delete test data
            </Button>
            <Button type="button" variant="danger" onClick={() => resetDanger("Reset business account")} className="w-full">
              <AlertTriangle className="h-4 w-4" />
              Reset business
            </Button>
            <Button type="button" variant="danger" onClick={() => resetDanger("Delete business")} className="w-full">
              <Trash2 className="h-4 w-4" />
              Delete business
            </Button>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
