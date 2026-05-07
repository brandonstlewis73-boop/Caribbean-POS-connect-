"use client";

import { useState } from "react";
import { Building2, Link2, MessageCircle, PlusCircle, Save, ShieldCheck, Truck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { DEFAULT_DELIVERY_RATES, ROLE_LABELS, TT_REGIONS } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Business, Settings, User } from "@/lib/types";

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
    <label className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-caribbean-line bg-white p-3 text-sm font-bold leading-tight dark:border-slate-700 dark:bg-slate-900">
      <span className="min-w-0">{label}</span>
      <input className="shrink-0" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    </label>
  );
}

const emptyBusinessDraft = {
  name: "",
  phone: "",
  email: "",
  street_address: "",
  city: "",
  region: "Port of Spain",
  country: "Trinidad and Tobago",
  currency: "TTD"
};

export function SettingsClient({
  settings,
  staff,
  businesses
}: {
  settings: Settings;
  staff: User[];
  businesses: Business[];
}) {
  const [draft, setDraft] = useState(settings);
  const [businessItems, setBusinessItems] = useState(businesses);
  const [businessDraft, setBusinessDraft] = useState(emptyBusinessDraft);
  const [message, setMessage] = useState("");
  const deliveryRates = { ...DEFAULT_DELIVERY_RATES, ...(draft.delivery_rates || {}) };

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateDeliveryRate(region: string, value: number) {
    update("delivery_rates", { ...deliveryRates, [region]: value });
  }

  async function save() {
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft)
    });
    const payload = await readApiPayload<{ settings: Settings }>(response);
    if (response.ok) {
      if (!payload.data?.settings) return setMessage("Settings saved, but no settings were returned.");
      setDraft(payload.data.settings);
      setMessage("Settings saved.");
    } else {
      setMessage(payload.error || "Settings could not be saved.");
    }
  }

  async function createBusinessProfile() {
    setMessage("");
    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(businessDraft)
    });
    const payload = await readApiPayload<{ business: Business }>(response);
    if (!response.ok) {
      setMessage(payload.error || "Business profile could not be created.");
      return;
    }
    if (!payload.data?.business) {
      setMessage("Business profile saved, but no profile was returned.");
      return;
    }
    setBusinessItems((current) => [payload.data!.business, ...current]);
    setBusinessDraft(emptyBusinessDraft);
    setMessage("Business profile created.");
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div className="grid min-w-0 gap-4">
        <Panel>
          <PanelHeader title="Business profile" />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Field label="Business name" value={draft.business_name} onChange={(event) => update("business_name", event.target.value)} />
            <Field label="Logo upload placeholder" type="file" />
            <Field label="Phone" value={draft.business_phone} onChange={(event) => update("business_phone", event.target.value)} />
            <Field label="Email" type="email" value={draft.business_email} onChange={(event) => update("business_email", event.target.value)} />
            <Field label="Address" value={draft.business_address} onChange={(event) => update("business_address", event.target.value)} className="md:col-span-2" />
            <Field label="Currency" value={draft.currency} readOnly />
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Business test profiles"
            description="Create business profiles for branches, vendors, and connected business accounts"
          />
          <div className="grid gap-4 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field
                label="Business name"
                value={businessDraft.name}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, name: event.target.value }))}
              />
              <Field
                label="Phone"
                value={businessDraft.phone}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, phone: event.target.value }))}
              />
              <Field
                label="Email"
                type="email"
                value={businessDraft.email}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <Field
                label="City/town"
                value={businessDraft.city}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, city: event.target.value }))}
              />
              <Field
                label="Street address"
                value={businessDraft.street_address}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, street_address: event.target.value }))}
                className="md:col-span-2"
              />
              <SelectField
                label="Region/corporation"
                value={businessDraft.region}
                onChange={(event) => setBusinessDraft((current) => ({ ...current, region: event.target.value }))}
              >
                {TT_REGIONS.map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </SelectField>
              <Field label="Country" value={businessDraft.country} readOnly />
            </div>
            <Button variant="primary" onClick={createBusinessProfile} disabled={!businessDraft.name.trim()}>
              <PlusCircle className="h-4 w-4" />
              Add business profile
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {businessItems.map((business) => (
                <div key={business.id} className="min-w-0 rounded-card border border-caribbean-line bg-caribbean-cloud p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex min-w-0 items-start gap-3">
                    <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-caribbean-teal" />
                    <div className="min-w-0">
                      <p className="truncate font-black">{business.name}</p>
                      <p className="text-xs font-semibold text-slate-500">
                        {[business.street_address, business.city, business.region].filter(Boolean).join(", ") || "No address yet"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">{business.phone || business.email || business.currency}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Tax, fees, receipt, and loyalty" />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Toggle label="Enable tax/service fee line" checked={draft.tax_enabled} onChange={(value) => update("tax_enabled", value)} />
            <Field label="Tax/Fee rate %" type="number" value={draft.tax_rate} onChange={(event) => update("tax_rate", Number(event.target.value))} />
            <Toggle label="Enable service fee" checked={draft.service_fee_enabled} onChange={(value) => update("service_fee_enabled", value)} />
            <Field label="Service fee rate %" type="number" value={draft.service_fee_rate} onChange={(event) => update("service_fee_rate", Number(event.target.value))} />
            <Field label="Default delivery fee" type="number" value={draft.delivery_fee} onChange={(event) => update("delivery_fee", Number(event.target.value))} />
            <Toggle label="Enable loyalty" checked={draft.loyalty_enabled} onChange={(value) => update("loyalty_enabled", value)} />
            <Field label="Points per TTD" type="number" step="0.01" value={draft.loyalty_points_per_ttd} onChange={(event) => update("loyalty_points_per_ttd", Number(event.target.value))} />
            <Field label="TTD value per point" type="number" step="0.01" value={draft.loyalty_redeem_ttd_per_point} onChange={(event) => update("loyalty_redeem_ttd_per_point", Number(event.target.value))} />
            <TextAreaField label="Receipt message" value={draft.receipt_message} onChange={(event) => update("receipt_message", event.target.value)} className="md:col-span-2" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Delivery rates by location" description="Used by POS and storefront delivery checkout" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {TT_REGIONS.map((region) => (
              <Field
                key={region}
                label={region}
                type="number"
                min="0"
                step="0.01"
                value={deliveryRates[region]}
                onChange={(event) => updateDeliveryRate(region, Number(event.target.value))}
              />
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Payment methods" />
          <div className="grid gap-3 p-4 md:grid-cols-3">
            <Toggle label="Cash" checked={draft.payment_cash_enabled} onChange={(value) => update("payment_cash_enabled", value)} />
            <Toggle label="Card" checked={draft.payment_card_enabled} onChange={(value) => update("payment_card_enabled", value)} />
            <Toggle label="Bank transfer" checked={draft.payment_bank_enabled} onChange={(value) => update("payment_bank_enabled", value)} />
            <Toggle label="PayPal" checked={draft.payment_paypal_enabled} onChange={(value) => update("payment_paypal_enabled", value)} />
            <Toggle label="WiPay / local digital wallet" checked={draft.payment_wipay_enabled} onChange={(value) => update("payment_wipay_enabled", value)} />
            <Toggle label="Pay on delivery" checked={draft.payment_pod_enabled} onChange={(value) => update("payment_pod_enabled", value)} />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Payment links and social channels" description="Store provider links; no automatic social posting is performed" />
          <div className="grid gap-3 p-4">
            <Toggle label="Generate payment links after checkout" checked={draft.payment_links_enabled} onChange={(value) => update("payment_links_enabled", value)} />
            <TextAreaField
              label="Payment link template"
              value={draft.payment_link_template}
              onChange={(event) => update("payment_link_template", event.target.value)}
              className="min-h-28"
            />
            <p className="text-sm font-semibold text-slate-500">
              Payment variables: {"{{order_number}}"}, {"{{receipt_number}}"}, {"{{amount}}"}, {"{{total_label}}"}, {"{{customer_name}}"}, {"{{customer_phone}}"}, {"{{payment_method}}"}.
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Facebook page URL" value={draft.facebook_url} onChange={(event) => update("facebook_url", event.target.value)} />
              <Field label="Instagram profile URL" value={draft.instagram_url} onChange={(event) => update("instagram_url", event.target.value)} />
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="WhatsApp orders" description="Click-to-chat links only; messages are not sent automatically." />
          <div className="grid gap-3 p-4">
            <Toggle label="Receive orders on WhatsApp" checked={draft.whatsapp_enabled} onChange={(value) => update("whatsapp_enabled", value)} />
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Business WhatsApp number" value={draft.whatsapp_business_number} onChange={(event) => update("whatsapp_business_number", event.target.value)} />
              <Field label="Default country code" value={draft.whatsapp_country_code} onChange={(event) => update("whatsapp_country_code", event.target.value)} />
            </div>
            <TextAreaField
              label="Custom WhatsApp order message template"
              value={draft.whatsapp_order_template}
              onChange={(event) => update("whatsapp_order_template", event.target.value)}
              className="min-h-48"
            />
            <p className="text-sm font-semibold text-slate-500">
              Available template variables: {"{{order_number}}"}, {"{{customer_name}}"}, {"{{customer_phone}}"}, {"{{address}}"}, {"{{items}}"}, {"{{total}}"}, {"{{payment_method}}"}, {"{{payment_status}}"}, {"{{payment_link}}"}, {"{{location_link}}"}, {"{{waze_link}}"}.
            </p>
          </div>
        </Panel>
      </div>

      <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-24">
        <Panel>
          <PanelHeader title="Staff and roles" description="Role permissions protect API routes and customer data" />
          <div className="divide-y divide-caribbean-line dark:divide-slate-800">
            {staff.map((user) => (
              <div key={user.id} className="flex min-w-0 items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-black">{user.name}</p>
                  <p className="text-xs font-semibold text-slate-500">{user.email}</p>
                </div>
                <Badge tone={user.role === "admin" ? "teal" : user.role === "driver" ? "amber" : "green"}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Privacy and safety" />
          <div className="grid gap-3 p-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <p className="flex gap-2"><ShieldCheck className="h-4 w-4 text-caribbean-teal" /> Passwords are hashed before storage.</p>
            <p className="flex gap-2"><UsersRound className="h-4 w-4 text-caribbean-teal" /> Customer records are available only through authenticated staff routes.</p>
            <p className="flex gap-2"><MessageCircle className="h-4 w-4 text-caribbean-teal" /> WhatsApp uses user-clicked links unless a Business API integration is added.</p>
            <p className="flex gap-2"><Truck className="h-4 w-4 text-caribbean-teal" /> Delivery fees are pulled from the customer region selected at checkout.</p>
            <p className="flex gap-2"><Link2 className="h-4 w-4 text-caribbean-teal" /> Payment links use your configured provider template and are saved on the order.</p>
          </div>
        </Panel>

        {message ? <p className="rounded-card bg-caribbean-cloud p-3 text-sm font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">{message}</p> : null}
        <Button variant="primary" size="lg" onClick={save}>
          <Save className="h-4 w-4" />
          Save settings
        </Button>
      </aside>
    </div>
  );
}
