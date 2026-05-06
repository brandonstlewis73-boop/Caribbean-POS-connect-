"use client";

import { useEffect, useMemo, useState } from "react";
import { History, MessageCircle, PlusCircle, Search, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { money, TT_REGIONS } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { cleanWhatsAppNumber } from "@/lib/whatsapp";
import type { Customer, CustomerInput, Order } from "@/lib/types";

type Profile = {
  customer: Customer;
  orders: Order[];
  favoriteProducts: Array<{ name: string; quantity: number }>;
};

function emptyCustomerDraft(): Customer {
  return {
    id: "new",
    name: "",
    phone: "",
    phone_normalized: "",
    email: "",
    street_address: "",
    community: "",
    city: "",
    region: "Chaguanas",
    country: "Trinidad and Tobago",
    delivery_notes: "",
    preferred_payment_method: "",
    notes: "",
    birthday: "",
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

function toCustomerPayload(customer: Customer): CustomerInput {
  return {
    name: nullableText(customer.name),
    phone: nullableText(customer.phone),
    email: nullableText(customer.email),
    street_address: nullableText(customer.street_address),
    community: nullableText(customer.community),
    city: nullableText(customer.city),
    region: nullableText(customer.region),
    country: nullableText(customer.country) || "Trinidad and Tobago",
    delivery_notes: nullableText(customer.delivery_notes),
    preferred_payment_method: nullableText(customer.preferred_payment_method),
    notes: nullableText(customer.notes),
    birthday: nullableText(customer.birthday),
    marketing_consent: Boolean(customer.marketing_consent)
  };
}

export function CustomersClient({ customers }: { customers: Customer[] }) {
  const [items, setItems] = useState(customers);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(customers[0]?.id || "");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [draft, setDraft] = useState<Customer | null>(customers[0] || null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((customer) =>
      !q || [customer.name, customer.phone, customer.email, customer.community, customer.city, customer.region]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [items, query]);

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
    setDraft(emptyCustomerDraft());
    setMessage("Enter the customer details, then save the profile.");
  }

  async function saveCustomer() {
    if (!draft) return;
    const payloadBody = toCustomerPayload(draft);
    if (!payloadBody.name && !payloadBody.phone && !payloadBody.email) {
      setMessage("Add at least a customer name, phone, or email before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    const isNew = draft.id === "new";
    const response = await fetch(isNew ? "/api/customers" : `/api/customers/${draft.id}`, {
      method: isNew ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadBody)
    });
    const payload = await readApiPayload<{ customer: Customer }>(response);
    setSaving(false);
    if (response.ok) {
      const updated = payload.data?.customer;
      if (!updated) return;
      setItems((current) => {
        if (isNew) {
          return [updated, ...current.filter((customer) => customer.id !== updated.id)];
        }
        return current.map((customer) => (customer.id === draft.id ? updated : customer));
      });
      setSelectedId(updated.id);
      setDraft(updated);
      setProfile((current) => current && current.customer.id === updated.id ? { ...current, customer: updated } : null);
      setMessage(isNew ? "Customer created." : "Customer profile saved.");
    } else {
      setMessage(payload.error || "Customer profile could not be saved.");
    }
  }

  const whatsAppMessage =
    draft && `Hi ${draft.name}, thank you for shopping with Caribbean POS Connect.`;
  const whatsAppLink =
    draft?.phone && whatsAppMessage
      ? `https://wa.me/${cleanWhatsAppNumber(draft.phone)}?text=${encodeURIComponent(whatsAppMessage)}`
      : null;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
      <Panel>
        <PanelHeader
          title="Customers"
          description="Search by phone, email, name, area, or city"
          action={
            <Button variant="primary" onClick={startNewCustomer}>
              <PlusCircle className="h-4 w-4" />
              New customer
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
              <span className="text-xs font-bold text-slate-400">{customer.community || customer.city || customer.region}</span>
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
              <p className="mt-2 text-2xl font-black">{money(draft.total_spent)}</p>
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
                <Field label="Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Phone" value={draft.phone || ""} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} />
                  <Field label="Email" value={draft.email || ""} onChange={(event) => setDraft({ ...draft, email: event.target.value })} />
                </div>
                <Field label="Birthday optional" type="date" value={draft.birthday || ""} onChange={(event) => setDraft({ ...draft, birthday: event.target.value })} />
                <TextAreaField label="Notes" value={draft.notes || ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
              </div>
              <div className="grid min-w-0 gap-3">
                <Field label="Street address" value={draft.street_address || ""} onChange={(event) => setDraft({ ...draft, street_address: event.target.value })} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Area/community" value={draft.community || ""} onChange={(event) => setDraft({ ...draft, community: event.target.value })} />
                  <Field label="City/town" value={draft.city || ""} onChange={(event) => setDraft({ ...draft, city: event.target.value })} />
                </div>
                <SelectField label="Region/corporation" value={draft.region || ""} onChange={(event) => setDraft({ ...draft, region: event.target.value })}>
                  {TT_REGIONS.map((region) => <option key={region}>{region}</option>)}
                </SelectField>
                <TextAreaField label="Delivery notes" value={draft.delivery_notes || ""} onChange={(event) => setDraft({ ...draft, delivery_notes: event.target.value })} />
                <label className="flex items-start gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={draft.marketing_consent}
                    onChange={(event) => setDraft({ ...draft, marketing_consent: event.target.checked })}
                    className="mt-1"
                  />
                  Marketing consent granted
                </label>
                <Button variant="primary" onClick={saveCustomer} disabled={saving}>
                  {saving ? "Saving..." : draft.id === "new" ? "Create customer" : "Save profile"}
                </Button>
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
                  <span className="font-black">{money(order.total)}</span>
                </div>
              )) : <p className="p-4 text-sm font-semibold text-slate-500">No orders saved for this customer yet.</p>}
            </div>
          </Panel>
        </div>
      ) : (
        <Panel className="grid min-h-80 place-items-center">
          <div className="text-center">
            <UserRound className="mx-auto h-10 w-10 text-slate-400" />
            <p className="mt-3 font-bold text-slate-500">Select a customer profile.</p>
          </div>
        </Panel>
      )}
    </div>
  );
}
