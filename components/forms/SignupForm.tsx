"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, SelectField } from "@/components/ui/Field";
import { CARIBBEAN_CURRENCIES, currencyOptionLabel, getDefaultCountryForCurrency } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { marketingPlans } from "@/lib/marketing-content";

export function SignupForm({ selectedPlan }: { selectedPlan?: string | null }) {
  const plan = marketingPlans.find((item) => item.id === selectedPlan);
  const router = useRouter();
  const [draft, setDraft] = useState({
    business_name: "",
    owner_name: "",
    email: "",
    whatsapp_number: "",
    password: "",
    country: "Trinidad and Tobago",
    currency: "TTD"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function update(key: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateCurrency(currency: string) {
    setDraft((current) => {
      const currentDefaultCountry = getDefaultCountryForCurrency(current.currency);
      return {
        ...current,
        currency,
        country: !current.country || current.country === currentDefaultCountry
          ? getDefaultCountryForCurrency(currency)
          : current.country
      };
    });
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });
      const payload = await readApiPayload<{ storefrontUrl: string }>(response);
      if (!response.ok) {
        setError(payload.error || "Signup failed. Please check the form and try again.");
        return;
      }
      router.push(plan ? `/subscription?plan=${plan.id}&setup=1` : "/dashboard?setup=1");
      router.refresh();
    } catch {
      setError("Signup failed. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid w-full max-w-xl gap-4 rounded-card border border-white/10 bg-white/[0.06] p-6 shadow-soft backdrop-blur-xl">
      <div>
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-card bg-cyan-300 text-slate-950">
          <Store className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-black">Create your POS storefront</h1>
        <p className="mt-2 text-sm font-semibold text-teal-50/70">
          Open a business account, get a storefront link, and start receiving orders.
        </p>
      </div>
      {plan ? <p className="rounded-card border border-cyan-200/30 bg-cyan-300/10 p-3 text-sm font-bold text-cyan-100">{plan.name} - US${plan.price}/mo. Create your account to review billing and confirm your plan.</p> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Business name" value={draft.business_name} onChange={(event) => update("business_name", event.target.value)} />
        <Field label="Owner name" value={draft.owner_name} onChange={(event) => update("owner_name", event.target.value)} />
        <Field label="Owner email" type="email" value={draft.email} onChange={(event) => update("email", event.target.value)} />
        <Field label="WhatsApp number" value={draft.whatsapp_number} onChange={(event) => update("whatsapp_number", event.target.value)} placeholder="+18681234567" />
        <Field label="Country" value={draft.country} onChange={(event) => update("country", event.target.value)} />
        <SelectField label="Currency" value={draft.currency} onChange={(event) => updateCurrency(event.target.value)}>
          {CARIBBEAN_CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currencyOptionLabel(currency)}
            </option>
          ))}
        </SelectField>
        <Field className="md:col-span-2" label="Password" type="password" value={draft.password} onChange={(event) => update("password", event.target.value)} />
      </div>
      {error ? <p className="rounded-card bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}
      <Button variant="primary" size="lg" disabled={loading}>
        <Building2 className="h-4 w-4" />
        {loading ? "Creating business..." : "Create business account"}
      </Button>
      <p className="text-center text-sm font-semibold text-teal-50/70">
        Already have an account? <Link href="/login" className="font-black text-cyan-200">Sign in</Link>
      </p>
    </form>
  );
}
