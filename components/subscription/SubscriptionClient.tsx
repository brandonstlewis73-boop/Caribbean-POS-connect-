"use client";
import {Workspace,WorkspaceSection} from "@/components/workspace/Workspace";

import { useState } from "react";
import { CheckCircle2, CreditCard, ShieldCheck, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { getCurrencyMeta } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import { normalizePlanId, type PlanUsageSummary } from "@/lib/plan-gating";
import type { Subscription, SubscriptionPlan, SubscriptionPlanId } from "@/lib/types";

function planPrice(plan: SubscriptionPlan) {
  const symbol = getCurrencyMeta(plan.currency).symbol;
  return `${symbol}${Number(plan.monthly_price).toFixed(Number.isInteger(plan.monthly_price) ? 0 : 2)}`;
}

export function SubscriptionClient({
  plans,
  selectedPlan,
  subscription,
  usageSummary,
  paymentProvidersReady,
  paypalResult,
  paypalEnvironment
}: {
  plans: SubscriptionPlan[];
  selectedPlan?: string | null;
  subscription: Subscription | null;
  usageSummary: PlanUsageSummary;
  paymentProvidersReady: { paypal: boolean };
  paypalResult?: string;
  paypalEnvironment?: string | null;
}) {
  const [current, setCurrent] = useState(subscription);
  const [mobilePlanId, setMobilePlanId] = useState(selectedPlan || "starter");
  const [message, setMessage] = useState(paypalResult === "success" ? "PayPal subscription confirmed." : paypalResult === "pending" ? "PayPal approval is processing. Your plan activates after payment confirmation." : paypalResult === "cancelled" ? "PayPal checkout was cancelled. Your current plan is unchanged." : paypalResult === "error" ? "We could not confirm this PayPal subscription. Please contact support." : "");
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);
  const currentPlanId = current?.status === "cancelled" || current?.status === "paused" || current?.status === "past_due" ? "trial" : normalizePlanId(current?.plan_id);
  const requestedPlan = selectedPlan ? plans.find((plan) => plan.id === normalizePlanId(selectedPlan)) : null;

  async function choosePlan(planId: SubscriptionPlanId) {
    setMessage("");
    setLoadingPlan(planId);
    try {
      const selectedPlan = plans.find((plan) => plan.id === planId);
      if (selectedPlan && selectedPlan.monthly_price > 0) {
        if (!paymentProvidersReady.paypal) {
          setLoadingPlan(null);
          setMessage("PayPal checkout is being set up. Please contact support.");
          return;
        }
        const checkout = await fetch("/api/paypal/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan_id: planId })
        });
        const checkoutPayload = await readApiPayload<{ url: string }>(checkout);
        setLoadingPlan(null);
        if (!checkout.ok || !checkoutPayload.data?.url) {
          setMessage(checkoutPayload.error || "PayPal checkout could not be started.");
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
        setMessage("Free plan selected.");
      }
    } catch {
      setMessage("Could not connect to billing. Check your connection and try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  async function openBillingPortal() {
    setMessage("");
    setLoadingPlan("business");
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const payload = await readApiPayload<{ url: string }>(response);
      setLoadingPlan(null);
      if (!response.ok || !payload.data?.url) {
        setMessage(payload.error || "Existing billing could not be opened.");
        return;
      }
      window.location.href = payload.data.url;
    } catch {
      setMessage("Could not connect to billing. Check your connection and try again.");
    } finally {
      setLoadingPlan(null);
    }
  }

  const hasPaymentProvider = paymentProvidersReady.paypal;
  const canManageStripe = current?.provider === "stripe" && Boolean(current.provider_customer_id);
  const canManagePayPal = current?.provider === "paypal" && Boolean(current.provider_subscription_id);
  const pricingPlans = (["starter", "premium", "pro"] as SubscriptionPlanId[])
    .map((planId) => plans.find((plan) => plan.id === planId))
    .filter(Boolean) as SubscriptionPlan[];
  const planDescriptions: Partial<Record<SubscriptionPlanId, string>> = {
    starter: "For new businesses that need POS, products, orders, and receipts.",
    premium: "For active teams that need storefront, staff tools, and messaging workflows.",
    pro: "For growing operations that need automation, reports, AI support, and scale."
  };
  const ctaLabels: Partial<Record<SubscriptionPlanId, string>> = {
    starter: "Start Starter",
    premium: "Start Business",
    pro: "Start Pro"
  };
  const planCompareRows = [
    { label: "POS checkout", starter: true, premium: true, pro: true },
    { label: "Products", starter: true, premium: true, pro: true },
    { label: "Orders", starter: true, premium: true, pro: true },
    { label: "Receipts", starter: true, premium: true, pro: true },
    { label: "Storefront", starter: false, premium: true, pro: true },
    { label: "Staff tools", starter: false, premium: true, pro: true },
    { label: "Messaging", starter: false, premium: true, pro: true },
    { label: "Reports", starter: false, premium: true, pro: true },
    { label: "Automation", starter: false, premium: false, pro: true },
    { label: "AI support", starter: false, premium: false, pro: true }
  ];

  return (
    <div>{requestedPlan ? <section className="mb-4 rounded-card border border-cyan-200/30 bg-[#0b1d2e] p-4 text-white">
      <p className="font-bold">Selected: {requestedPlan.name} - {planPrice(requestedPlan)}/mo</p>
      <p className="mt-2 text-sm text-slate-200">Review your plan, then continue to billing to confirm.</p>
      <button type="button" onClick={() => choosePlan(requestedPlan.id)} disabled={loadingPlan !== null || currentPlanId === requestedPlan.id} className="mt-3 min-h-11 rounded-lg bg-cyan-300 px-4 font-bold text-slate-950 disabled:opacity-60">{loadingPlan === requestedPlan.id ? "Loading..." : currentPlanId === requestedPlan.id ? "Current plan" : "Continue with PayPal"}</button>
    </section> : null}<Workspace label="Subscription sections" initialValue={requestedPlan?'plans':'account'}><WorkspaceSection id="account" title="Current subscription" icon="pricing"><Panel>
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
            <p className="mt-2 text-sm font-black">{hasPaymentProvider ? "PayPal subscription checkout" : "PayPal checkout is being set up"}</p>
            {canManageStripe ? (
              <Button type="button" variant="secondary" className="mt-3 w-full" onClick={openBillingPortal} disabled={loadingPlan !== null}>
                <CreditCard className="h-4 w-4" />
                Manage billing
              </Button>
            ) : null}
          </div>
        </div>
      </Panel><section className="mb-4 rounded-card border border-cyan-200/30 p-4 text-sm">
      <p>Subscriptions are billed monthly in USD through PayPal. Confirm the amount and recurring payment on PayPal before subscribing.</p>
      {paypalEnvironment === "sandbox" ? <p className="mt-2 font-bold">Test checkout only — no live payments.</p> : null}
      {canManagePayPal ? <a className="mt-2 inline-block underline" href={paypalEnvironment === "sandbox" ? "https://www.sandbox.paypal.com/myaccount/autopay/" : "https://www.paypal.com/myaccount/autopay/"} target="_blank" rel="noopener noreferrer">Manage or cancel your PayPal subscription</a> : null}
      {canManageStripe ? <Button className="mt-2" onClick={openBillingPortal}>Manage existing subscription</Button> : null}
    </section></WorkspaceSection><WorkspaceSection id="usage" title="Plan usage" icon="reports"><Panel>
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
      </Panel></WorkspaceSection><WorkspaceSection id="plans" title="Choose a plan" icon="options"><div className="md:hidden"><section className="kyte-plan-stage">
        <div className="subscription-plan-picker">
          <label htmlFor="subscription-mobile-plan">Monthly plan</label>
          <select id="subscription-mobile-plan" value={pricingPlans.some(plan => plan.id === mobilePlanId) ? mobilePlanId : pricingPlans[0]?.id} onChange={event => setMobilePlanId(event.target.value)}>
            {pricingPlans.map(plan => <option key={plan.id} value={plan.id}>{plan.name} — {planPrice(plan)}/month</option>)}
          </select>
        </div>
        <div className="kyte-plan-carousel">
          {pricingPlans.filter(plan => plan.id === (pricingPlans.some(item => item.id === mobilePlanId) ? mobilePlanId : pricingPlans[0]?.id)).map((plan) => {
            const active = currentPlanId === plan.id;
            const highlighted = plan.id === "premium";
            return (
              <article key={plan.id} className={`kyte-plan-card ${highlighted ? "highlighted" : ""}`}>
                {highlighted ? <span className="kyte-plan-popular">Most popular</span> : null}
                <p>{plan.audience}</p>
                <h2>{plan.name}</h2>
                <div className="kyte-plan-price">
                  <strong>{planPrice(plan)}</strong>
                  <span>/mo</span>
                </div>
                <p className="kyte-plan-description">{planDescriptions[plan.id] || plan.audience}</p>
                <ul>
                  {plan.features.slice(0, 4).map((feature) => (
                    <li key={feature}>
                      <CheckCircle2 className="h-5 w-5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => choosePlan(plan.id)}
                  disabled={loadingPlan !== null || active}
                  className="kyte-plan-button"
                >
                  {loadingPlan === plan.id ? "Loading..." : active ? "Current plan" : ctaLabels[plan.id] || "Choose plan"}
                </button>
              </article>
            );
          })}
        </div>

      </section></div><div className="hidden md:block"><section className="relative overflow-hidden rounded-[34px] border border-cyan-200/12 bg-[radial-gradient(circle_at_50%_0%,rgba(18,214,223,0.18),transparent_34%),linear-gradient(135deg,rgba(6,23,42,0.98),rgba(9,31,50,0.96)_48%,rgba(5,14,27,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-7">
        <div className="pointer-events-none absolute -right-24 top-10 h-64 w-64 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="relative mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan-200">Choose your plan</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">Simple plans for serious businesses</h2>
            <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-slate-300">
              Start with the tools you need today, then upgrade as your storefront, staff, messaging, and AI workflows grow.
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-200/20 bg-white/8 px-4 py-2 text-xs font-black text-cyan-50 shadow-lg">
            <ShieldCheck className="h-4 w-4 text-cyan-200" />
            Monthly billing
          </div>
        </div>

        <div className="relative grid items-stretch gap-5 lg:grid-cols-3">
          {pricingPlans.map((plan) => {
          const active = currentPlanId === plan.id;
          const highlighted = plan.id === "premium";
          return (
            <div
              key={plan.id}
              className={`relative flex min-h-[470px] flex-col overflow-hidden rounded-[32px] border p-6 shadow-2xl transition duration-300 hover:-translate-y-1 sm:p-7 ${
                highlighted
                  ? "border-cyan-200/55 bg-gradient-to-br from-cyan-400/18 via-white/[0.08] to-slate-950/76 shadow-cyan-950/45 ring-1 ring-cyan-300/35"
                  : "border-white/10 bg-white/[0.055] shadow-slate-950/35"
              } ${active ? "ring-2 ring-emerald-300/60" : ""}`}
            >
              {highlighted ? (
                <div className="absolute inset-x-5 top-4 flex justify-end">
                  <span className="rounded-full bg-gradient-to-r from-cyan-300 to-teal-300 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-slate-950 shadow-lg shadow-cyan-950/30">
                    Most Popular
                  </span>
                </div>
              ) : null}
              <div className="flex h-full flex-col gap-6 pt-6">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-cyan-200">{plan.audience}</p>
                      <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{plan.name}</h3>
                    </div>
                    {active ? <Badge tone="teal">Current</Badge> : null}
                  </div>
                  <p className="mt-5 flex flex-wrap items-end gap-x-2 gap-y-1 text-5xl font-black leading-none tracking-tight text-white sm:text-6xl">
                    <span>{planPrice(plan)}</span>
                    <span className="pb-1 text-base font-black leading-5 text-slate-300">/mo</span>
                  </p>
                  <p className="mt-5 min-h-16 text-sm font-semibold leading-6 text-slate-300">{planDescriptions[plan.id] || plan.audience}</p>
                </div>
                <div className="flex flex-1 content-start flex-wrap gap-2">
                  {plan.features.map((feature) => (
                    <span key={feature} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-slate-100">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-300" />
                      {feature}
                    </span>
                  ))}
                </div>
                <Button
                  variant={active ? "secondary" : "primary"}
                  onClick={() => choosePlan(plan.id)}
                  disabled={loadingPlan !== null || active}
                  className={`w-full rounded-full ${active ? "" : highlighted ? "bg-gradient-to-r from-cyan-300 to-teal-300 text-slate-950 hover:from-cyan-200 hover:to-teal-200" : "bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:from-blue-500 hover:to-cyan-400"}`}
                >
                  {plan.id === "starter" ? <Sparkles className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  {loadingPlan === plan.id ? "Loading..." : active ? "Current plan" : ctaLabels[plan.id] || "Choose plan"}
                </Button>
              </div>
            </div>
          );
          })}
        </div>
      </section></div></WorkspaceSection><WorkspaceSection id="compare" title="Compare features" icon="catalog"><section className="kyte-compare-plans">
        <div className="kyte-compare-title">
          <h2>Compare plans</h2>
          <span />
        </div>
        <div className="kyte-compare-table">
          <div className="kyte-compare-row header">
            <span>Features</span>
            <strong>Starter</strong>
            <strong>Business</strong>
            <strong>Pro</strong>
          </div>
          {planCompareRows.map((row) => (
            <div key={row.label} className="kyte-compare-row">
              <span>{row.label}</span>
              <strong>{row.starter ? <CheckCircle2 className="h-5 w-5" /> : "-"}</strong>
              <strong>{row.premium ? <CheckCircle2 className="h-5 w-5" /> : "-"}</strong>
              <strong>{row.pro ? <CheckCircle2 className="h-5 w-5" /> : "-"}</strong>
            </div>
          ))}
        </div>
      </section></WorkspaceSection></Workspace>{message ? <p role="status" className="subscription-checkout-message">{message}</p> : null}</div>
  );
}
