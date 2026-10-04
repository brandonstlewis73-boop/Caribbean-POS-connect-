import { LockKeyhole } from "lucide-react";
import { AI_BUSINESS_TOOLS, type AiBusinessToolId } from "@/lib/ai-business-config";
import { PLAN_ORDER, type PlanId } from "@/lib/plan-gating";
import { workflowName } from "@/lib/ai-workspace-presentation";
const categories = Array.from(new Set(AI_BUSINESS_TOOLS.map(tool => tool.category)));
export function AiWorkspaceNavigation({ selected, plan, onSelect, disabled, usage }: {
  selected: AiBusinessToolId; plan: PlanId; onSelect: (id: AiBusinessToolId) => void;
  disabled: boolean; usage?: {used:number;limit:number|null};
}) {
  return <>
    <aside className="aw-navigation" aria-label="AI workflows">
      <div className="aw-nav-groups">{categories.map(category => <section key={category}>
        <h3>{category}</h3>
        {AI_BUSINESS_TOOLS.filter(tool => tool.category === category).map(tool => {
          const locked=PLAN_ORDER.indexOf(plan)<PLAN_ORDER.indexOf(tool.requiredPlan);
          return <button type="button" key={tool.id} aria-pressed={selected===tool.id} disabled={disabled}
            onClick={()=>onSelect(tool.id)} className={selected===tool.id ? "aw-workflow-selected" : ""}>
            <span>{workflowName(tool.id)}</span>{locked?<LockKeyhole size={13} aria-label="Requires upgrade" />:null}
          </button>;
        })}
      </section>)}</div>
      <div className="aw-nav-footer"><span>AI usage</span><strong>{usage?`${usage.used} / ${usage.limit??"Unlimited"}`:"Unavailable"}</strong></div>
    </aside>
    <label className="aw-mobile-workflow" htmlFor="ai-workflow"><span>Workflow</span>
      <select id="ai-workflow" value={selected} disabled={disabled} onChange={event=>onSelect(event.target.value as AiBusinessToolId)}>
        {categories.map(category=><optgroup label={category} key={category}>{AI_BUSINESS_TOOLS.filter(tool=>tool.category===category).map(tool=><option key={tool.id} value={tool.id}>{workflowName(tool.id)}</option>)}</optgroup>)}
      </select>
    </label>
  </>;
}
