"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { ChevronRight, History, LocateFixed, MessageCircle, Plus, PlusCircle, Search, Trash2, UserRound, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, TextAreaField } from "@/components/ui/Field";
import { getDefaultCountryForCurrency, money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { detectCurrentAddress } from "@/lib/location-client";
import { cleanWhatsAppNumber } from "@/lib/whatsapp";
import type { Customer, CustomerInput, Order } from "@/lib/types";

type Profile = {
  customer: Customer;
  orders: Order[];
  favoriteProducts: Array<{ name: string; quantity: number }>;
};

function emptyCustomerDraft(currency: string): Customer {
  return {
    id: "new",
    name: "",
    phone: "",
    phone_normalized: "",
    email: "",
    street_address: "",
    city: "",
    region: null,
    country: getDefaultCountryForCurrency(currency),
    postal_code: "",
    delivery_notes: "",
    waze_link: "",
    gps_latitude: null,
    gps_longitude: null,
    preferred_payment_method: "",
    notes: "",
    birthday: "",
    notification_whatsapp: true,
    notification_sms: false,
    notification_email: false,
    marketing_consent: false,
    loyalty_points: 0,
    total_spent: 0,
    orders_count: 0,
    last_order_at: null,
    tags: ["New Customer"]
  };
}

function nullableText(value?: string | null) {
  const trimmed = String(value || "").trim();
  return trimmed ? trimmed : undefined;
}

function toCustomerPayload(customer: Customer, currency: string): CustomerInput {
  return {
    name: nullableText(customer.name),
    phone: nullableText(customer.phone),
    email: nullableText(customer.email),
    street_address: nullableText(customer.street_address),
    city: nullableText(customer.city),
    region: nullableText(customer.region),
    country: nullableText(customer.country) || getDefaultCountryForCurrency(currency),
    postal_code: nullableText(customer.postal_code),
    delivery_notes: nullableText(customer.delivery_notes),
    waze_link: nullableText(customer.waze_link),
    gps_latitude: customer.gps_latitude ?? undefined,
    gps_longitude: customer.gps_longitude ?? undefined,
    notification_whatsapp: customer.notification_whatsapp,
    notification_sms: customer.notification_sms,
    notification_email: customer.notification_email
  };
}

function usefulError(payloadError?: string, details?: unknown) {
  if (payloadError) return payloadError;
  if (details && typeof details === "object") return "Check the highlighted customer fields and try again.";
  return "Customer could not be saved. Please check the details and try again.";
}

export function CustomersClient({ customers, currency }: { customers: Customer[]; currency: string }) {
  const [items, setItems] = useState(customers);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(customers[0]?.id || "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Customer | null>(customers[0] || null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [mobileProfileOpen, setMobileProfileOpen] = useState(false);
  const deferredQuery = useDeferredValue(query);
  const formatMoney = (value: number | string | null | undefined) => money(value, currency);

  const filtered = useMemo(() => {
    const q = deferredQuery.toLowerCase().trim();
    return items.filter((customer) =>
      !q || [customer.name, customer.phone, customer.email, customer.city, customer.country]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, deferredQuery]);

  useEffect(() => {
    if (!selectedId || selectedId === "new") {
      setProfile(null);
      return;
    }
    fetch(`/api/customers/${selectedId}`)
      .then((response) => readApiPayload<Profile>(response))
      .then((payload) => {
        if (payload.data) {
          setProfile(payload.data);
          setDraft(payload.data.customer);
        }
      })
      .catch(() => null);
  }, [selectedId]);

  function startNewCustomer() {
    setSelectedId("new");
    setProfile(null);
    setDraft(emptyCustomerDraft(currency));
    setMessage("Enter the customer details, then save the profile.");
    setMobileProfileOpen(true);
  }

  async function refreshCustomers(customerId: string) {
    const [listResponse, detailResponse] = await Promise.all([
      fetch("/api/customers"),
      fetch(`/api/customers/${customerId}`)
    ]);
    const listPayload = await readApiPayload<{ customers: Customer[] }>(listResponse);
    const detailPayload = await readApiPayload<Profile>(detailResponse);
    if (listPayload.data?.customers) setItems(listPayload.data.customers);
    if (detailPayload.data) {
      setProfile(detailPayload.data);
      setDraft(detailPayload.data.customer);
    }
  }

  async function saveCustomer() {
    if (!draft) return;
    const payloadBody = toCustomerPayload(draft, currency);
    if (!payloadBody.name && !payloadBody.phone && !payloadBody.email) {
      setMessage("Add at least a customer name, phone, or email before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      const isNew = draft.id === "new";
      const response = await fetch(isNew ? "/api/customers" : `/api/customers/${draft.id}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadBody)
      });
      const payload = await readApiPayload<{ customer: Customer }>(response);
      if (!response.ok) {
        setMessage(usefulError(payload.error, payload.details));
        return;
      }
      const updated = payload.data?.customer;
      if (!updated) {
        setMessage("Customer saved, but the server did not return the customer profile.");
        return;
      }
      setSelectedId(updated.id);
      await refreshCustomers(updated.id);
      setQuery("");
      setMessage("Customer saved successfully.");
    } catch {
      setMessage("Customer could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  async function useCurrentLocation() {
    if (!draft) return;
    setMessage("Finding your location...");
    setLocating(true);
    try {
      const { address } = await detectCurrentAddress();
      setDraft((current) =>
        current
          ? {
              ...current,
              street_address: address.street || address.formatted || current.street_address,
              city: address.city || current.city,
              region: address.region || current.region,
              country: address.country || current.country,
              postal_code: address.postalCode || current.postal_code,
              gps_latitude: address.lat,
              gps_longitude: address.lng,
              waze_link: `https://waze.com/ul?ll=${address.lat},${address.lng}&navigate=yes`
            }
          : current
      );
      setMessage("Address added. Please check it before saving.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Location could not be detected. You can still enter the address manually.");
    } finally {
      setLocating(false);
    }
  }

  async function deleteCustomer() {
    if (!draft || draft.id === "new") return;
    if (!window.confirm(`Delete ${draft.name || "this customer"}? Existing orders keep their history, but this customer profile will be removed.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/customers/${draft.id}`, { method: "DELETE" });
      const payload = await readApiPayload<{ customer: Customer }>(response);
      if (!response.ok) {
        setMessage(payload.error || "Customer could not be deleted.");
        return;
      }
      const remaining = items.filter((customer) => customer.id !== draft.id);
      setItems(remaining);
      setProfile(null);
      setQuery("");
      setSelectedId(remaining[0]?.id || "");
      setDraft(remaining[0] || null);
      setMessage("Customer deleted.");
    } catch {
      setMessage("Customer could not be deleted. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  const whatsAppMessage =
    draft && `Hi ${draft.name}, thank you for shopping with Caribbean POS Connect.`;
  const whatsAppLink =
    draft?.phone && whatsAppMessage
      ? `https://wa.me/${cleanWhatsAppNumber(draft.phone)}?text=${encodeURIComponent(whatsAppMessage)}`
      : null;

  return (
    <>
    <div className="kyte-mobile-screen kyte-customers-screen md:hidden">
      <section className="kyte-mobile-toolbar">
        <label className="kyte-mobile-search">
          <Search className="h-6 w-6 text-slate-500" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or contact information"
          />
        </label>
        <button type="button" className="kyte-square-action" onClick={startNewCustomer} aria-label="Add customer">
          <Plus className="h-7 w-7" />
        </button>
      </section>

      <section className="kyte-customer-list" aria-label="Customers">
        {filtered.map((customer) => {
          const whatsappHref = customer.phone
            ? `https://wa.me/${cleanWhatsAppNumber(customer.phone)}`
            : "";
          return (
            <div key={customer.id} className="kyte-customer-row">
              <button
                type="button"
                className="kyte-customer-main"
                onClick={() => {
                  setSelectedId(customer.id);
                  setDraft(customer);
                  setMobileProfileOpen(true);
                }}
              >
                <span className="min-w-0 flex-1">
                  <strong>{customer.name || customer.phone || "Unnamed customer"}</strong>
                  <small>
                    {customer.last_order_at
                      ? `Last purchase: ${new Date(customer.last_order_at).toLocaleDateString()} - ${formatMoney(customer.total_spent)}`
                      : customer.phone || customer.email || "No contact saved"}
                  </small>
                </span>
              </button>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noreferrer"
                  className="kyte-whatsapp-link"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Message ${customer.name || "customer"} on WhatsApp`}
                >
                  <MessageCircle className="h-6 w-6" />
                </a>
              ) : (
                <span className="kyte-whatsapp-link disabled" aria-hidden>
                  <MessageCircle className="h-6 w-6" />
                </span>
              )}
              <ChevronRight className="h-5 w-5 text-slate-400" />
            </div>
          );
        })}
        {!filtered.length ? (
          <div className="kyte-empty-state">
            <p>No customers found.</p>
            <span>Create a customer or clear the search.</span>
          </div>
        ) : null}
      </section>

      {mobileProfileOpen && draft ? (
        <div className="kyte-sheet-backdrop" onClick={() => setMobileProfileOpen(false)}>
          <section className="kyte-bottom-sheet" onClick={(event) => event.stopPropagation()} aria-label="Customer profile">
            <div className="kyte-sheet-handle" />
            <div className="kyte-sheet-header">
              <div>
                <h2>{draft.id === "new" ? "New customer" : "Customer profile"}</h2>
                <p>{draft.orders_count || 0} orders - {formatMoney(draft.total_spent || 0)} spent</p>
              </div>
              <button type="button" onClick={() => setMobileProfileOpen(false)} aria-label="Close customer profile">
                <X className="h-5 w-5" />
              </button>
            </div>
            {message ? <p className="kyte-mobile-notice">{message}</p> : null}
            <div className="kyte-sheet-form">
              <label className="full">
                <span>Full name</span>
                <input value={draft.name || ""} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Customer name" />
              </label>
              <label>
                <span>Phone</span>
                <input value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="Phone number" />
              </label>
              <label>
                <span>Email</span>
                <input value={draft.email || ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} placeholder="Email optional" />
              </label>
              <label className="full">
                <span>Address</span>
                <input value={draft.street_address || ""} onChange={(event) => setDraft({ ...draft, street_address: event.target.value })} placeholder="Street address" />
              </label>
              <label>
                <span>City</span>
                <input value={draft.city || ""} onChange={(event) => setDraft({ ...draft, city: event.target.value })} placeholder="City" />
              </label>
              <label>
                <span>Country</span>
                <input value={draft.country || getDefaultCountryForCurrency(currency)} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
              </label>
            </div>
            <div className="grid gap-3 px-1">
              <button type="button" className="kyte-secondary-action" onClick={useCurrentLocation} disabled={locating}>
                <LocateFixed className="h-5 w-5" />
                {locating ? "Finding location..." : "Use current location"}
              </button>
              <button type="button" className="kyte-primary-action" onClick={saveCustomer} disabled={saving}>
                {saving ? "Saving..." : draft.id === "new" ? "Create customer" : "Save profile"}
              </button>
              {draft.id !== "new" ? (
                <button type="button" className="kyte-danger-action" onClick={deleteCustomer} disabled={saving}>
                  <Trash2 className="h-5 w-5" />
                  Delete customer
                </button>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>

    <div className="hidden min-w-0 gap-4 md:grid xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          title="Customers"
          description="Search by phone, email, name, or city"
          action={
            <Button variant="primary" onClick={startNewCustomer}>
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          }
        />
        <div className="border-b border-caribbean-line p-4 dark:border-slate-800">
          <label className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search customers"
              className="h-10 w-full rounded-card border border-caribbean-line bg-white pl-10 pr-3 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900"
            />
          </label>
        </div>
        <div className="max-h-[calc(100vh-240px)] overflow-auto">
          {filtered.map((customer) => (
            <button
              key={customer.id}
              onClick={() => setSelectedId(customer.id)}
              className={`grid w-full gap-1 border-b border-caribbean-line px-4 py-3 text-left dark:border-slate-800 ${
                selectedId === customer.id ? "bg-teal-50 dark:bg-teal-950/30" : "hover:bg-caribbean-cloud dark:hover:bg-slate-950"
              }`}
            >
              <span className="font-black">{customer.name}</span>
              <span className="text-sm font-semibold text-slate-500">{customer.phone || customer.email}</span>
              <span className="text-xs font-bold text-slate-400">{customer.city || customer.country}</span>
            </button>
          ))}
          {!filtered.length ? (
            <div className="p-4 text-sm font-semibold text-slate-500">No customers match this search.</div>
          ) : null}
        </div>
      </Panel>

      {draft ? (
        <div className="grid min-w-0 gap-4">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500">Total spent</p>
              <p className="mt-2 text-2xl font-black">{formatMoney(draft.total_spent)}</p>
            </div>
            <div className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500">Orders</p>
              <p className="mt-2 text-2xl font-black">{draft.orders_count}</p>
            </div>
            <div className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500">Loyalty points</p>
              <p className="mt-2 text-2xl font-black">{draft.loyalty_points}</p>
            </div>
            <div className="rounded-card border border-caribbean-line bg-white p-4 shadow-soft dark:border-slate-800 dark:bg-slate-900">
              <p className="text-sm font-bold text-slate-500">Last order</p>
              <p className="mt-2 text-sm font-black">{draft.last_order_at ? new Date(draft.last_order_at).toLocaleDateString() : "None"}</p>
            </div>
          </div>

          <Panel>
            <PanelHeader
              title={draft.id === "new" ? "New customer profile" : "Customer profile"}
              action={
                whatsAppLink ? (
                  <a href={whatsAppLink} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-card bg-caribbean-palm px-3 py-2 text-sm font-black leading-tight text-white">
                    <MessageCircle className="h-4 w-4" />
                    WhatsApp customer
                  </a>
                ) : null
              }
            />
            {message ? (
              <p className="mx-4 mt-4 rounded-card bg-caribbean-cloud p-3 text-sm font-black text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                {message}
              </p>
            ) : null}
            <div className="grid min-w-0 gap-4 p-4 xl:grid-cols-2">
              <div className="grid min-w-0 gap-3">
                <Field label="Customer name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone number" value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                  <Field label="Email optional" type="email" value={draft.email || ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                </div>
                <Field label="Street address" value={draft.street_address || ""} onChange={(event) => setDraft({ ...draft, street_address: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="City/town" value={draft.city || ""} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
                  <Field label="Country" value={draft.country || getDefaultCountryForCurrency(currency)} onChange={(event) => setDraft({ ...draft, country: event.target.value })} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Region/County optional" value={draft.region || ""} onChange={(event) => setDraft({ ...draft, region: event.target.value })} />
                  <Field label="Postal code optional" value={draft.postal_code || ""} onChange={(event) => setDraft({ ...draft, postal_code: event.target.value })} />
                </div>
                <TextAreaField label="Delivery notes" value={draft.delivery_notes || ""} onChange={(event) => setDraft({ ...draft, delivery_notes: event.target.value })} />
              </div>
              <div className="grid min-w-0 gap-3">
                <Button type="button" onClick={useCurrentLocation} disabled={locating}>
                  <LocateFixed className="h-4 w-4" />
                  {locating ? "Finding your location..." : "Use My Current Location"}
                </Button>
                <Field label="Waze link optional" value={draft.waze_link || ""} onChange={(event) => setDraft({ ...draft, waze_link: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="GPS latitude optional"
                    type="number"
                    step="0.000001"
                    value={draft.gps_latitude ?? ""}
                    onChange={(event) => setDraft({ ...draft, gps_latitude: event.target.value ? Number(event.target.value) : null })}
                  />
                  <Field
                    label="GPS longitude optional"
                    type="number"
                    step="0.000001"
                    value={draft.gps_longitude ?? ""}
                    onChange={(event) => setDraft({ ...draft, gps_longitude: event.target.value ? Number(event.target.value) : null })}
                  />
                </div>
                <div className="grid gap-2 rounded-card border border-caribbean-line bg-white p-3 text-sm font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 sm:grid-cols-3">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.notification_whatsapp} onChange={(event) => setDraft({ ...draft, notification_whatsapp: event.target.checked })} />
                    WhatsApp updates
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.notification_sms} onChange={(event) => setDraft({ ...draft, notification_sms: event.target.checked })} />
                    SMS updates
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={draft.notification_email} onChange={(event) => setDraft({ ...draft, notification_email: event.target.checked })} />
                    Email updates
                  </label>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button variant="primary" onClick={saveCustomer} disabled={saving}>
                    {saving ? "Saving..." : draft.id === "new" ? "Create customer" : "Save profile"}
                  </Button>
                  {draft.id !== "new" ? (
                    <Button variant="danger" onClick={deleteCustomer} disabled={saving}>
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          </Panel>

          <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <Panel>
              <PanelHeader title="Tags" description="Automatically updated from buying behavior" />
              <div className="flex flex-wrap gap-2 p-4">
              {draft.tags.map((tag) => <Badge key={tag} tone={tag === "Owes Balance" ? "red" : tag === "VIP" ? "teal" : "green"}>{tag}</Badge>)}
            </div>
          </Panel>
            <Panel>
              <PanelHeader title="Favorite products" />
              <div className="divide-y divide-caribbean-line dark:divide-slate-800">
                {profile?.favoriteProducts.length ? profile.favoriteProducts.map((item) => (
                  <div key={item.name} className="flex min-w-0 justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0 font-bold">{item.name}</span>
                    <span className="font-semibold text-slate-500">{item.quantity} ordered</span>
                  </div>
                )) : <p className="p-4 text-sm font-semibold text-slate-500">No purchase history yet.</p>}
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Order history" />
            <div className="divide-y divide-caribbean-line dark:divide-slate-800">
              {profile?.orders.length ? profile.orders.map((order) => (
                <div key={order.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="flex min-w-0 items-center gap-2">
                    <History className="h-4 w-4 text-caribbean-teal" />
                    <span className="font-black">#{order.order_number}</span>
                  </div>
                  <span className="text-sm font-semibold text-slate-500">{new Date(order.created_at).toLocaleString()}</span>
                  <span className="font-black">{formatMoney(order.total)}</span>
                </div>
              )) : <p className="p-4 text-sm font-semibold text-slate-500">No orders saved for this customer yet.</p>}
            </div>
          </Panel>
        </div>
      ) : (
        <Panel className="grid min-h-80 place-items-center">
          <div className="text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-bold text-slate-500">No customers yet. Add your first customer.</p>
            <Button className="mt-4" variant="primary" onClick={startNewCustomer}>
              <PlusCircle className="h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </Panel>
      )}
    </div>
    </>
  );
}
