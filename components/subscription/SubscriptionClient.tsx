"use client";

import { useState } from "react";
import { CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { money } from "@/lib/constants";
import { readApiPayload } from "@/lib/client-response";
import type { Subscription, SubscriptionPlan, SubscriptionPlanId } from "@/lib/types";

export function SubscriptionClient({
  plans,
  subscription,
  paymentProvidersReady
}: {
  plans: SubscriptionPlan[];
  subscription: Subscription | null;
  paymentProvidersReady: { stripe: boolean; paypal: boolean; wipay: boolean };
}) {
  const [current, setCurrent] = useState(subscription);
  const [message, setMessage] = useState("");
  const [loadingPlan, setLoadingPlan] = useState<SubscriptionPlanId | null>(null);

  async function choosePlan(planId: SubscriptionPlanId) {
    setMessage("");
    setLoadingPlan(planId);
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

  const hasPaymentProvider = paymentProvidersReady.stripe || paymentProvidersReady.paypal || paymentProvidersReady.wipay;

  return (
    <div className="grid min-w-0 gap-4">
      <Panel>
        <PanelHeader
          title="Subscription"
          description="Manage your Caribbean Connect POS plan, trial status, and payment provider readiness"
          action={current ? <Badge tone={current.status === "active" ? "green" : "amber"}>{current.status}</Badge> : null}
        />
        <div className="grid gap-4 p-4 md:grid-cols-3">
          <div className="rounded-card border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-bold text-teal-50/60">Current plan</p>
            <p className="mt-2 text-2xl font-black">{current?.plan_name || "No plan selected"}</p>
          </div>
          <div className="rounded-card border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-bold text-teal-50/60">Trial status</p>
            <p className="mt-2 text-sm font-black">
              {current?.trial_ends_at ? `Trial ends ${new Date(current.trial_ends_at).toLocaleDateString()}` : "Trial available"}
            </p>
          </div>
          <div className="rounded-card border border-white/10 bg-black/25 p-4">
            <p className="text-sm font-bold text-teal-50/60">Payment checkout</p>
            <p className="mt-2 text-sm font-black">{hasPaymentProvider ? "Provider keys detected" : "Ready for Stripe, PayPal, or WiPay setup"}</p>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const active = current?.plan_id === plan.id;
          return (
            <Panel key={plan.id} className={active ? "border-cyan-300/60" : ""}>
              <div className="grid h-full gap-4 p-5">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-cyan-200">{plan.audience}</p>
                      <h2 className="mt-2 text-2xl font-black">{plan.name}</h2>
                    </div>
                    {active ? <Badge tone="teal">Current</Badge> : null}
                  </div>
                  <p className="mt-4 text-3xl font-black">{money(plan.monthly_price)}<span className="text-sm text-teal-50/55"> / month</span></p>
                </div>
                <div className="grid gap-2">
                  {plan.features.map((feature) => (
                    <p key={feature} className="flex gap-2 text-sm font-bold text-teal-50/75">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      {feature}
                    </p>
                  ))}
                </div>
                <Button variant={active ? "secondary" : "primary"} onClick={() => choosePlan(plan.id)} disabled={loadingPlan !== null || active}>
                  {plan.id === "starter" ? <Sparkles className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                  {loadingPlan === plan.id ? "Updating..." : active ? "Current plan" : current ? "Upgrade Plan" : "Start Trial"}
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
