"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { normalizePlanId, type PlanUsageSummary } from "@/lib/plan-gating";
import type { Subscription, SubscriptionPlan, SubscriptionPlanId } from "@/lib/types";

export function SubscriptionClient({
  plans,
  subscription,
  usageSummary,
  paymentProvidersReady,
  stripeStatus
}: {
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  usageSummary: PlanUsageSummary;
  paymentProvidersReady: { stripe: boolean; paypal: boolean; wipay: boolean };
  stripeStatus?: {
    configured: boolean;
    webhookConfigured: boolean;
    readyForPaidCheckout: boolean;
    missing: string[];
  };
}) {
  const [current, setCurrent] = useState(subscription);
  const [message, setMessage] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const currentPlanId = normalizePlanId(current?.plan_id);

  async function choosePlan(planId: SubscriptionPlanId) {
    setMessage("");
    setLoadingPlan(planId);
    const selectedPlan = plans.find((plan) => plan.id === planId);
    if (selectedPlan && selectedPlan.monthly_price > 0) {
      if (!paymentProvidersReady.stripe) {
        setLoadingPlan(null);
        setMessage("Stripe is not configured. Add STRIPE_SECRET_KEY and plan price IDs in Vercel, then redeploy.");
        return;
      }
      const checkout = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId })
      });
      const checkoutPayload = await readApiPayload<{ url: string }>(checkout);
      setLoadingPlan(null);
      if (!checkout.ok || !checkoutPayload.data?.url) {
        setMessage(checkoutPayload.error || "Stripe checkout could not be started.");
        return;
      }
      window.location.href = checkoutPayload.data.url;
      return;
    }

    const response = await fetch("/api/subscription", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan_id: planId })
    });
    const payload = await readApiPayload<{ subscription: Subscription }>(response);
    setLoadingPlan(null);
    if (!response.ok) {
      setMessage(payload.error || "Plan could not be updated.");
      return;
    }
    if (payload.data?.subscription) {
      setCurrent(payload.data.subscription);
      setMessage("Subscription plan updated. Payment checkout can be connected next.");
    }
  }

  async function openBillingPortal() {
    setMessage("");
    setLoadingPlan("business");
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const payload = await readApiPayload<{ url: string }>(response);
    setLoadingPlan(null);
    if (!response.ok || !payload.data?.url) {
      setMessage(payload.error || "Stripe billing portal could not be opened.");
      return;
    }
    window.location.href = payload.data.url;
  }

  const hasPaymentProvider = paymentProvidersReady.stripe || paymentProvidersReady.paypal || paymentProvidersReady.wipay;
  const canManageStripe = paymentProvidersReady.stripe && current?.provider === "stripe" && Boolean(current.provider_customer_id);

  return (
    <div className="grid min-w-0 gap-4">
      <Panel>
        <PanelHeader
          title="Subscription"
          description="Manage your Caribbean POS Connect plan, trial status, and payment provider readiness"
          action={current ? <Badge tone={current.status === "active" ? "green" : "amber"}>{current.status}</Badge> : null}
        />
        <div className="grid gap-5 p-5 md:grid-cols-3 sm:p-6">
          <div className="rounded-3xl border border-cyan-200/12 bg-slate-950/35 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.20)]">
            <p className="text-sm font-bold text-teal-50/60">Current plan</p>
            <p className="mt-2 text-2xl font-black">{current?.plan_name || "No plan selected"}</p>
          </div>
          <div className="rounded-3xl border border-cyan-200/12 bg-slate-950/35 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.20)]">
            <p className="text-sm font-bold text-teal-50/60">Trial status</p>
            <p className="mt-2 text-sm font-black">
              {current?.trial_ends_at ? `Trial ends ${new Date(current.trial_ends_at).toLocaleDateString()}` : "Trial available"}
            </p>
          </div>
          <div className="rounded-3xl border border-cyan-200/12 bg-slate-950/35 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.20)]">
            <p className="text-sm font-bold text-teal-50/60">Payment checkout</p>
            <p className="mt-2 text-sm font-black">{hasPaymentProvider ? "Stripe checkout available" : "Ready for Stripe, PayPal, or WiPay setup"}</p>
            {stripeStatus && stripeStatus.missing.length ? (
              <p className="mt-2 text-xs font-bold text-amber-200">Missing Stripe setup: {stripeStatus.missing.join(", ")}</p>
            ) : null}
            {canManageStripe ? (
              <Button type="button" variant="secondary" className="mt-3 w-full" onClick={openBillingPortal} disabled={loadingPlan !== null}>
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            ) : null}
          </div>
        </div>
      </Panel>

      <Panel>
        <PanelHeader
          title="Usage this month"
          description="Plan limits are enforced in the dashboard and API so locked features show upgrade options instead of breaking."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 xl:grid-cols-3 sm:p-6">
          {usageSummary.meters.map((meter) => (
            <div key={meter.key} className="rounded-3xl border border-cyan-200/12 bg-slate-950/35 p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-white">{meter.label}</p>
                  <p className="mt-1 text-xs font-bold text-teal-50/55">
                    {meter.locked ? "Locked on this plan" : meter.limit === null ? `${meter.used} used` : `${meter.used} / ${meter.limit}`}
                  </p>
                </div>
                {meter.locked ? <Badge tone="amber">Upgrade</Badge> : meter.limit === null ? <Badge tone="green">Unlimited</Badge> : null}
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-cyan-300" style={{ width: `${meter.limit === null ? 100 : meter.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const active = currentPlanId === plan.id;
          return (
            <Panel key={plan.id} className={active ? "border-cyan-300/70 shadow-[0_22px_80px_rgba(18,214,223,0.16)]" : ""}>
              <div className="flex h-full min-h-[440px] flex-col gap-6 p-6 sm:p-7">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-cyan-200">{plan.audience}</p>
                      <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
                    </div>
                    {active ? <Badge tone="teal">Current</Badge> : null}
                  </div>
                  <p className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1 text-4xl font-black leading-none text-white"><span>{money(plan.monthly_price, plan.currency)}</span><span className="pb-1 text-sm font-bold leading-5 text-slate-300">/ month</span></p>
                </div>
                <div className="grid flex-1 content-start gap-3">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex items-start gap-3 text-sm font-semibold leading-6 text-slate-200">
                      <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-cyan-300" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button variant={active ? "secondary" : "primary"} onClick={() => choosePlan(plan.id)} disabled={loadingPlan !== null || active}>
                  {plan.id === "starter" ? <Sparkles className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  {loadingPlan === plan.id ? "Loading..." : active ? "Current plan" : plan.monthly_price > 0 ? "Checkout with Stripe" : current ? "Switch plan" : "Start trial"}
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>

      {message ? <p className="rounded-card border border-white/10 bg-white/[0.06] p-3 text-sm font-black text-teal-50">{message}</p> : null}
    </div>
  );
}
