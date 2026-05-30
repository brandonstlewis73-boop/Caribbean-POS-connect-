"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent } from "react";
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
import { SUBSCRIPTION_PLANS, getDefaultDeliveryRatesForCurrency } from "@/lib/constants";
import type { Business, Category, Settings, Subscription, User } from "@/lib/types";

const MAX_LOGO_SIZE_BYTES = 750 * 1024;
const LOGO_IMAGE_TYPES = ["image/png", "image/jpeg"];

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
  subscription
}: {
  settings: Settings;
  staff: User[];
  businesses: Business[];
  categories: Category[];
  subscription: Subscription | null;
}) {
  const [draft, setDraft] = useState(settings);
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
  const [locationMessage, setLocationMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busyId, setBusyId] = useState("");
  const activeBusiness = businesses.find((business) => business.id === draft.active_business_id) || businesses[0] || null;
  const storefrontSlug = activeBusiness?.storefront_slug || activeBusiness?.slug || safeSlug(draft.business_name) || "storefront";
  const storefrontUrl = `/store/${storefrontSlug}`;
  const absoluteStorefrontUrl = useMemo(() => {
    if (typeof window === "undefined") return storefrontUrl;
    return new URL(storefrontUrl, window.location.origin).toString();
  }, [storefrontUrl]);

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
    if (!LOGO_IMAGE_TYPES.includes(file.type)) {
      setMessage("Logo must be a PNG or JPG image.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setMessage("Logo must be 750 KB or smaller.");
      return;
    }
    try {
      const logoUrl = await readFileAsDataUrl(file);
      setDraft((current) => ({ ...current, logo_url: logoUrl }));
      setMessage("Logo ready. Save changes to apply it.");
    } catch {
      setMessage("Logo could not be uploaded.");
    }
  }

  async function copyStorefrontLink() {
    try {
      await navigator.clipboard.writeText(absoluteStorefrontUrl);
      setMessage("Storefront link copied.");
    } catch {
      setMessage("Copy failed. Open the storefront and copy the browser link.");
    }
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
            <SelectField label="Business type" value="retail" onChange={() => undefined}>
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
            <Field label="Currency" value={draft.currency || "TTD"} readOnly />
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
            <Field label="Storefront slug/link" value={storefrontSlug} readOnly />
            <SelectField label="Storefront status" value="live" onChange={() => undefined}>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </SelectField>
            <Field label="Store hours" value="Open during business hours" onChange={() => undefined} />
            <Toggle label="Delivery available" checked={draft.delivery_fee >= 0} onChange={() => undefined} />
            <Toggle label="Pickup available" checked={draft.payment_pod_enabled || true} onChange={() => undefined} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <a href={storefrontUrl} target="_blank" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-4 text-sm font-black text-white transition hover:bg-white/[0.12]">
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

        <SettingsCard id="whatsapp" icon={Bell} title="Order Notifications" description="Automatic customer updates connected to order status changes.">
          <div className="grid gap-3">
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
          <Button type="button" variant="primary" onClick={() => saveSettings("Notification settings saved.")} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save notifications
          </Button>
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
                  <span className="grid h-9 w-9 place-items-center rounded-card border border-white/10" style={{ backgroundColor: category.color || "#14b8a6" }}>{category.icon || "•"}</span>
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

        <SettingsCard icon={CreditCard} title="Payments" description="Choose payment methods and customer payment instructions.">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle label="Cash" checked={draft.payment_cash_enabled} onChange={(value) => update("payment_cash_enabled", value)} />
            <Toggle label="Card" checked={draft.payment_card_enabled} onChange={(value) => update("payment_card_enabled", value)} />
            <Toggle label="Bank transfer" checked={draft.payment_bank_enabled} onChange={(value) => update("payment_bank_enabled", value)} />
            <Toggle label="WiPay" checked={draft.payment_wipay_enabled} onChange={(value) => update("payment_wipay_enabled", value)} />
            <Toggle label="PayPal" checked={draft.payment_paypal_enabled} onChange={(value) => update("payment_paypal_enabled", value)} />
            <Toggle label="Payment required before fulfillment" checked={!draft.payment_pod_enabled} onChange={(value) => update("payment_pod_enabled", !value)} />
          </div>
          <TextAreaField label="Manual payment instructions" value={draft.payment_link_template} onChange={(event) => update("payment_link_template", event.target.value)} />
          <Button type="button" variant="primary" onClick={() => saveSettings("Payment settings saved.")} disabled={saving} className="w-full sm:w-auto">
            <Save className="h-4 w-4" />
            Save payments
          </Button>
        </SettingsCard>

        <SettingsCard icon={Truck} title="Delivery / Waze" description="Delivery pricing and navigation settings for drivers.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Toggle label="Enable delivery" checked={draft.delivery_fee >= 0} onChange={(value) => update("delivery_fee", value ? Math.max(0, draft.delivery_fee) : 0)} />
            <Field label="Default delivery fee" type="number" value={draft.delivery_fee} onChange={(event) => update("delivery_fee", Number(event.target.value))} />
            <Field label="Free delivery minimum" type="number" value={0} onChange={() => undefined} />
            <Toggle label="Waze navigation enabled" checked onChange={() => undefined} />
            <Toggle label="Driver can open customer address in Waze" checked onChange={() => undefined} />
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

        <SettingsCard icon={CreditCard} title="Subscription / Billing" description="Plan controls for selling Caribbean Connect POS as a SaaS product.">
          <div className="grid gap-3">
            <div className="rounded-card border border-white/10 bg-black/20 p-4">
              <p className="text-sm font-bold text-teal-50/60">Current plan</p>
              <p className="mt-1 text-2xl font-black text-white">{subscription?.plan_name || "Starter"}</p>
              <p className="mt-1 text-sm font-semibold text-teal-50/60">Status: {subscription?.status || "trial"}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {SUBSCRIPTION_PLANS.map((plan) => (
                <div key={plan.id} className="rounded-card border border-white/10 bg-white/[0.045] p-3">
                  <p className="font-black text-white">{plan.name.replace(" Plan", "")}</p>
                  <p className="mt-1 text-sm font-semibold text-teal-50/55">{plan.currency}{plan.monthly_price}/mo</p>
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
                src={draft.logo_url || "/logo.svg"}
                alt=""
                width={64}
                height={64}
                unoptimized={Boolean(draft.logo_url?.startsWith("data:"))}
                className="h-16 w-16 rounded-card bg-white object-contain p-2"
              />
              <label className="mt-4 inline-flex min-h-10 cursor-pointer items-center justify-center rounded-card border border-white/10 bg-white/[0.07] px-4 text-sm font-black text-white">
                Upload logo
                <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={uploadLogo} />
              </label>
            </div>
            <div className="grid gap-4">
              <Field label="Business color" value="#14b8a6" onChange={() => undefined} />
              <Field label="Storefront banner" value={draft.logo_url || ""} onChange={(event) => update("logo_url", event.target.value)} />
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
            <Button type="button" variant="danger" onClick={() => resetDanger("Delete demo data")} className="w-full">
              <Trash2 className="h-4 w-4" />
              Delete demo data
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
