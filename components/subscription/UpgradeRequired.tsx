import Link from "next/link";
import { LockKeyhole, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { PLAN_CONFIG, type PlanId } from "@/lib/plan-gating";

export function UpgradeRequired({
  title,
  description,
  requiredPlan,
  currentPlan
}: {
  title: string;
  description: string;
  requiredPlan: PlanId;
  currentPlan: PlanId;
}) {
  return (
    <Panel className="mx-auto max-w-3xl">
      <PanelHeader
        title={title}
        description={description}
        action={<Badge tone="amber">Upgrade required</Badge>}
      />
      <div className="grid gap-4 p-5">
        <div className="rounded-card border border-amber-300/20 bg-amber-300/10 p-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-amber-300/15 text-amber-100">
              <LockKeyhole className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-black text-white">
                Your current plan is {PLAN_CONFIG[currentPlan].name}. This feature starts on {PLAN_CONFIG[requiredPlan].name}.
              </p>
              <p className="mt-2 text-sm font-semibold leading-6 text-teal-50/65">
                Existing data stays safe. Upgrade when you are ready and this screen will unlock automatically.
              </p>
            </div>
          </div>
        </div>
        <Link
          href="/subscription"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-cyan-300 px-4 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
        >
          <Sparkles className="h-4 w-4" />
          View upgrade options
        </Link>
      </div>
    </Panel>
  );
}
