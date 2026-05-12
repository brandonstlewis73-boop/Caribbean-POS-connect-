"use client";

import { useState, type ChangeEvent } from "react";
import { Building2, Link2, MessageCircle, PlusCircle, RefreshCw, Save, ShieldCheck, Trash2, Truck, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import {
  CARIBBEAN_CURRENCIES,
  ROLE_LABELS,
  currencyOptionLabel,
  getDefaultCountryForCurrency,
  getDefaultDeliveryRatesForCurrency,
  getDeliveryRegionsForCurrency
} from "@/lib/constants";
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

function createEmptyBusinessDraft(currency = "TTD") {
  const regions = getDeliveryRegionsForCurrency(currency);
  return {
    name: "",
    phone: "",
    email: "",
    street_address: "",
    city: "",
    region: regions[0] || "",
    country: getDefaultCountryForCurrency(currency),
    currency
  };
}

function businessAddress(business: Business) {
  return [business.street_address, business.city, business.region, business.country].filter(Boolean).join(", ");
}

const MAX_LOGO_SIZE_BYTES = 750 * 1024;
const LOGO_IMAGE_TYPES = ["image/png", "image/jpeg"];

type WhatsAppStatus = {
  enabled: boolean;
  selectedProvider: string | null;
  configured: boolean;
  missing: string[];
  message: string;
  twilio: {
    hasAccountSid: boolean;
    hasAuthToken: boolean;
    hasFrom: boolean;
    fromUsesWhatsAppPrefix: boolean;
  };
  meta: {
    hasToken: boolean;
    hasPhoneNumberId: boolean;
  };
};

type WhatsAppTestResult = {
  message: string;
  ok: boolean;
  skipped?: boolean;
  status?: WhatsAppStatus;
};

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Logo could not be read."));
    reader.readAsDataURL(file);
  });
}

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
  const [businessDraft, setBusinessDraft] = useState(() => createEmptyBusinessDraft(settings.currency));
  const [message, setMessage] = useState("");
  const [whatsAppTestMessage, setWhatsAppTestMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [businessBusyId, setBusinessBusyId] = useState("");
  const deliveryRegions = getDeliveryRegionsForCurrency(draft.currency);
  const defaultDeliveryRates = getDefaultDeliveryRatesForCurrency(draft.currency);
  const deliveryRates = Object.fromEntries(
    deliveryRegions.map((region) => [
      region,
      Number((draft.delivery_rates || {})[region] ?? defaultDeliveryRates[region] ?? draft.delivery_fee ?? 0)
    ])
  ) as Record<string, number>;

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function settingsWithCurrency(current: Settings, currency: string): Settings {
    const rates = getDefaultDeliveryRatesForCurrency(currency);
    return {
      ...current,
      currency,
      delivery_rates: Object.fromEntries(
        getDeliveryRegionsForCurrency(currency).map((region) => [
          region,
          Number((current.delivery_rates || {})[region] ?? rates[region] ?? current.delivery_fee ?? 0)
        ])
      )
    };
  }

  async function saveSettings(nextDraft: Settings, successMessage = "Settings saved.") {
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextDraft)
      });
      const payload = await readApiPayload<{ settings: Settings }>(response);
      if (response.ok) {
        if (!payload.data?.settings) {
          setMessage("Settings saved, but no settings were returned.");
          return false;
        }
        setDraft(payload.data.settings);
        setMessage(successMessage);
        return true;
      }
      setMessage(payload.error || "Settings could not be saved.");
      return false;
    } catch {
      setMessage("Settings could not be saved. Check your connection and try again.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function sendWhatsAppTest() {
    setWhatsAppTestMessage("Sending WhatsApp test...");
    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: draft.whatsapp_business_number,
          message: `Test WhatsApp message from ${draft.business_name}.`
        })
      });
      const payload = await readApiPayload<{ result: WhatsAppTestResult; status: WhatsAppStatus }>(response);
      if (!response.ok) {
        setWhatsAppTestMessage(payload.error || "WhatsApp test failed.");
        return;
      }
      setWhatsAppTestMessage(payload.data?.result?.message || payload.data?.status?.message || "WhatsApp test sent.");
    } catch {
      setWhatsAppTestMessage("WhatsApp test failed. Check server settings and try again.");
    }
  }

  async function checkWhatsAppStatus() {
    setWhatsAppTestMessage("Checking WhatsApp configuration...");
    try {
      const response = await fetch("/api/whatsapp/test");
      const payload = await readApiPayload<{ status: WhatsAppStatus }>(response);
      if (!response.ok) {
        setWhatsAppTestMessage(payload.error || "WhatsApp configuration could not be checked.");
        return;
      }
      setWhatsAppTestMessage(payload.data?.status?.message || "WhatsApp configuration checked.");
    } catch {
      setWhatsAppTestMessage("WhatsApp configuration could not be checked. Check your connection and try again.");
    }
  }

  async function updateCurrency(currency: string) {
    const previousDraft = draft;
    const nextDraft = settingsWithCurrency(draft, currency);
    setDraft(nextDraft);
    setBusinessDraft((current) => ({
      ...current,
      currency,
      region: getDeliveryRegionsForCurrency(currency)[0] || "",
      country: getDefaultCountryForCurrency(currency)
    }));
    setMessage(`Switching store currency to ${currency}...`);
    const saved = await saveSettings(nextDraft, `Store currency switched to ${currency}.`);
    if (!saved) {
      setDraft(previousDraft);
      setBusinessDraft((current) => ({
        ...current,
        currency: previousDraft.currency,
        region: getDeliveryRegionsForCurrency(previousDraft.currency)[0] || "",
        country: getDefaultCountryForCurrency(previousDraft.currency)
      }));
    }
  }

  function updateBusinessCurrency(currency: string) {
    setBusinessDraft((current) => ({
      ...current,
      currency,
      region: getDeliveryRegionsForCurrency(currency)[0] || "",
      country: getDefaultCountryForCurrency(currency)
    }));
  }

  function updateDeliveryRate(region: string, value: number) {
    update("delivery_rates", { ...deliveryRates, [region]: value });
  }

  function isLiveBusiness(business: Business) {
    if (draft.active_business_id) return draft.active_business_id === business.id;
    return draft.business_name === business.name && draft.currency === business.currency;
  }

  async function switchBusinessProfile(business: Business) {
    const previousDraft = draft;
    const currency = business.currency || draft.currency;
    const nextDraft = settingsWithCurrency(
      {
        ...draft,
        active_business_id: business.id,
        business_name: business.name,
        business_phone: business.phone || "",
        business_email: business.email || "",
        business_address: businessAddress(business) || draft.business_address,
        logo_url: business.logo_url || draft.logo_url || "/logo.svg"
      },
      currency
    );
    setDraft(nextDraft);
    setBusinessDraft((current) => ({
      ...current,
      currency,
      region: getDeliveryRegionsForCurrency(currency)[0] || "",
      country: getDefaultCountryForCurrency(currency)
    }));
    setBusinessBusyId(business.id);
    setMessage(`Switching live business to ${business.name}...`);
    const saved = await saveSettings(nextDraft, `${business.name} is now the live business.`);
    if (!saved) setDraft(previousDraft);
    setBusinessBusyId("");
  }

  async function deleteBusinessProfile(business: Business) {
    if (isLiveBusiness(business)) {
      setMessage("Switch to another business before deleting the live business profile.");
      return;
    }
    if (business.id === "biz_savannah_sea") {
      setMessage("The default business profile is tied to store data and cannot be deleted.");
      return;
    }
    if (!window.confirm(`Delete ${business.name}? Store settings stay as-is, but this business profile will be removed.`)) return;
    setBusinessBusyId(business.id);
    setMessage("");
    try {
      const response = await fetch(`/api/businesses/${business.id}`, { method: "DELETE" });
      const payload = await readApiPayload<{ business: Business }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Business profile could not be deleted.");
        return;
      }
      setBusinessItems((current) => current.filter((item) => item.id !== business.id));
      setMessage("Business profile deleted.");
    } catch {
      setMessage("Business profile could not be deleted. Check your connection and try again.");
    } finally {
      setBusinessBusyId("");
    }
  }

  async function uploadStoreLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!LOGO_IMAGE_TYPES.includes(file.type)) {
      setMessage("Logo must be a PNG or JPG image so it can print on receipts.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setMessage("Logo must be 750 KB or smaller.");
      return;
    }
    const previousDraft = draft;
    try {
      const logoUrl = await readFileAsDataUrl(file);
      const nextDraft = { ...draft, logo_url: logoUrl };
      setDraft(nextDraft);
      const saved = await saveSettings(nextDraft, "Store logo uploaded. It will appear on the storefront and receipts.");
      if (!saved) setDraft(previousDraft);
    } catch {
      setMessage("Logo could not be uploaded. Try a smaller PNG or JPG.");
    }
  }

  async function useDefaultLogo() {
    const previousDraft = draft;
    const nextDraft = { ...draft, logo_url: "/logo.svg" };
    setDraft(nextDraft);
    const saved = await saveSettings(nextDraft, "Default logo restored.");
    if (!saved) setDraft(previousDraft);
  }

  async function save() {
    await saveSettings(draft);
  }

  async function createBusinessProfile() {
    setMessage("");
    const response = await fetch("/api/businesses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...businessDraft, logo_url: draft.logo_url || null })
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
    setBusinessDraft(createEmptyBusinessDraft(draft.currency));
    setMessage("Business profile created.");
  }

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]">
      <div className="grid min-w-0 gap-4">
        <Panel>
          <PanelHeader title="Business profile" />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Field label="Business name" value={draft.business_name} onChange={(event) => update("business_name", event.target.value)} />
            <div className="grid gap-2 md:row-span-2">
              <span className="text-sm font-bold text-teal-50">Storefront & receipt logo</span>
              <div className="flex min-w-0 items-center gap-3 rounded-card border border-white/10 bg-black/30 p-3">
                <img src={draft.logo_url || "/logo.svg"} alt="" className="h-14 w-14 shrink-0 rounded-card bg-white object-contain p-1" />
                <div className="min-w-0 text-xs font-semibold text-teal-50/65">
                  <p className="font-bold text-teal-50">Public storefront and receipt logo.</p>
                  <p>PNG or JPG, 750 KB max.</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-card border border-white/10 bg-white/[0.07] px-4 text-center text-sm font-black leading-tight text-white transition hover:bg-white/[0.12]">
                  Upload logo
                  <input type="file" accept="image/png,image/jpeg" className="sr-only" onChange={uploadStoreLogo} disabled={saving} />
                </label>
                <Button type="button" onClick={useDefaultLogo} disabled={saving}>
                  Use default
                </Button>
              </div>
            </div>
            <Field label="Phone" value={draft.business_phone} onChange={(event) => update("business_phone", event.target.value)} />
            <Field label="Email" type="email" value={draft.business_email} onChange={(event) => update("business_email", event.target.value)} />
            <Field label="Address" value={draft.business_address} onChange={(event) => update("business_address", event.target.value)} className="md:col-span-2" />
            <SelectField label="Store currency" value={draft.currency} onChange={(event) => updateCurrency(event.target.value)} disabled={saving}>
              {CARIBBEAN_CURRENCIES.map((currency) => (
                <option key={currency.code} value={currency.code}>
                  {currencyOptionLabel(currency)} - {currency.territories}
                </option>
              ))}
            </SelectField>
          </div>
        </Panel>

        <Panel>
          <PanelHeader
            title="Business profiles"
            description="Switch the live store between saved businesses, branches, and vendor profiles"
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
                {getDeliveryRegionsForCurrency(businessDraft.currency).map((region) => (
                  <option key={region}>{region}</option>
                ))}
              </SelectField>
              <Field label="Country/market" value={businessDraft.country} onChange={(event) => setBusinessDraft((current) => ({ ...current, country: event.target.value }))} />
              <SelectField
                label="Profile currency"
                value={businessDraft.currency}
                onChange={(event) => updateBusinessCurrency(event.target.value)}
              >
                {CARIBBEAN_CURRENCIES.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currencyOptionLabel(currency)}
                  </option>
                ))}
              </SelectField>
            </div>
            <Button variant="primary" onClick={createBusinessProfile} disabled={!businessDraft.name.trim()}>
              <PlusCircle className="h-4 w-4" />
              Add business profile
            </Button>
            <div className="grid gap-3 md:grid-cols-2">
              {businessItems.map((business) => (
                <div key={business.id} className="min-w-0 rounded-card border border-caribbean-line bg-caribbean-cloud p-3 dark:border-slate-800 dark:bg-slate-950">
                  <div className="flex min-w-0 items-start gap-3">
                    {business.logo_url || draft.logo_url ? (
                      <img
                        src={business.logo_url || draft.logo_url || "/logo.svg"}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-card bg-white object-contain p-1"
                      />
                    ) : (
                      <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-caribbean-teal" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate font-black">{business.name}</p>
                        {isLiveBusiness(business) ? <Badge tone="teal">Live</Badge> : null}
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        {businessAddress(business) || "No address yet"}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-400">{business.phone || business.email || business.currency}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={isLiveBusiness(business) ? "success" : "secondary"}
                      onClick={() => switchBusinessProfile(business)}
                      disabled={saving || businessBusyId === business.id || isLiveBusiness(business)}
                    >
                      <RefreshCw className="h-4 w-4" />
                      {isLiveBusiness(business) ? "Live business" : "Switch"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => deleteBusinessProfile(business)}
                      disabled={saving || businessBusyId === business.id || isLiveBusiness(business)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
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
            <Field label={`Points per ${draft.currency}`} type="number" step="0.01" value={draft.loyalty_points_per_ttd} onChange={(event) => update("loyalty_points_per_ttd", Number(event.target.value))} />
            <Field label={`${draft.currency} value per point`} type="number" step="0.01" value={draft.loyalty_redeem_ttd_per_point} onChange={(event) => update("loyalty_redeem_ttd_per_point", Number(event.target.value))} />
            <TextAreaField label="Receipt message" value={draft.receipt_message} onChange={(event) => update("receipt_message", event.target.value)} className="md:col-span-2" />
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={`Delivery rates by location (${draft.currency})`} description="Areas update to match the selected store currency" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {deliveryRegions.map((region) => (
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
          <PanelHeader title="WhatsApp automation" description="Automatic sending uses Twilio or Meta credentials from environment variables." />
          <div className="grid gap-3 p-4">
            <Toggle label="Enable WhatsApp features" checked={draft.whatsapp_enabled} onChange={(value) => update("whatsapp_enabled", value)} />
            <Toggle label="Send owner alert when a new order is created" checked={draft.whatsapp_owner_alerts_enabled} onChange={(value) => update("whatsapp_owner_alerts_enabled", value)} />
            <Toggle label="Send customer confirmation when order is placed" checked={draft.whatsapp_customer_confirmations_enabled} onChange={(value) => update("whatsapp_customer_confirmations_enabled", value)} />
            <Toggle label="Send customer receipt when order is completed" checked={draft.whatsapp_customer_receipts_enabled} onChange={(value) => update("whatsapp_customer_receipts_enabled", value)} />
            <Toggle label="Send customer update when a driver is assigned" checked={draft.whatsapp_driver_assignment_enabled} onChange={(value) => update("whatsapp_driver_assignment_enabled", value)} />
            <Toggle label="Send driver alert when assigned to an order" checked={draft.whatsapp_driver_alerts_enabled} onChange={(value) => update("whatsapp_driver_alerts_enabled", value)} />
            <Toggle label="Send customer update when order is out for delivery" checked={draft.whatsapp_out_for_delivery_enabled} onChange={(value) => update("whatsapp_out_for_delivery_enabled", value)} />
            <div className="grid gap-3 md:grid-cols-2">
              <SelectField label="WhatsApp provider" value={draft.whatsapp_provider || "twilio"} onChange={(event) => update("whatsapp_provider", event.target.value)}>
                <option value="twilio">Twilio WhatsApp</option>
                <option value="meta">Meta WhatsApp Cloud API</option>
              </SelectField>
              <Field label="Business WhatsApp number" value={draft.whatsapp_business_number} onChange={(event) => update("whatsapp_business_number", event.target.value)} />
              <Field label="Default country code" value={draft.whatsapp_country_code} onChange={(event) => update("whatsapp_country_code", event.target.value)} placeholder="+1-868" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="secondary" onClick={checkWhatsAppStatus}>
                <ShieldCheck className="h-4 w-4" />
                Check config
              </Button>
              <Button type="button" onClick={sendWhatsAppTest}>
                <MessageCircle className="h-4 w-4" />
                Send test message
              </Button>
              {whatsAppTestMessage ? <span className="text-sm font-bold text-slate-500">{whatsAppTestMessage}</span> : null}
            </div>
            <TextAreaField
              label="Owner order alert template"
              value={draft.whatsapp_order_template}
              onChange={(event) => update("whatsapp_order_template", event.target.value)}
              className="min-h-48"
            />
            <TextAreaField
              label="Customer order confirmation template"
              value={draft.whatsapp_customer_confirmation_template}
              onChange={(event) => update("whatsapp_customer_confirmation_template", event.target.value)}
              className="min-h-40"
            />
            <TextAreaField
              label="Customer receipt template"
              value={draft.whatsapp_customer_receipt_template}
              onChange={(event) => update("whatsapp_customer_receipt_template", event.target.value)}
              className="min-h-48"
            />
            <TextAreaField
              label="Customer driver assigned template"
              value={draft.whatsapp_driver_assigned_template}
              onChange={(event) => update("whatsapp_driver_assigned_template", event.target.value)}
              className="min-h-36"
            />
            <TextAreaField
              label="Driver assignment alert template"
              value={draft.whatsapp_driver_alert_template}
              onChange={(event) => update("whatsapp_driver_alert_template", event.target.value)}
              className="min-h-36"
            />
            <TextAreaField
              label="Customer out for delivery template"
              value={draft.whatsapp_out_for_delivery_template}
              onChange={(event) => update("whatsapp_out_for_delivery_template", event.target.value)}
              className="min-h-36"
            />
            <p className="text-sm font-semibold text-slate-500">
              Template variables: {"{{business_name}}"}, {"{{business_phone}}"}, {"{{order_number}}"}, {"{{customer_name}}"}, {"{{customer_phone}}"}, {"{{order_type}}"}, {"{{address}}"}, {"{{items}}"}, {"{{total}}"}, {"{{payment_method}}"}, {"{{payment_status}}"}, {"{{order_status}}"}, {"{{delivery_status}}"}, {"{{driver_name}}"}, {"{{driver_phone}}"}, {"{{date_time}}"}, {"{{completed_at}}"}, {"{{dashboard_link}}"}, {"{{payment_link}}"}, {"{{location_link}}"}, {"{{waze_link}}"}, {"{{receipt_message}}"}.
            </p>
            <p className="rounded-card bg-caribbean-cloud p-3 text-sm font-bold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
              Add provider secrets in Vercel only: WHATSAPP_PROVIDER, Twilio keys, or Meta WhatsApp token and phone number ID. If they are missing, orders still save and the server logs “WhatsApp is not configured.”
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
        <Button variant="primary" size="lg" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save settings"}
        </Button>
      </aside>
    </div>
  );
}
