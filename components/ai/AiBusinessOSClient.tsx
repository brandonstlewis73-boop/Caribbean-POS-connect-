"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bot, Clipboard, Loader2, LockKeyhole, Send } from "lucide-react";
import { assertLocalAiSupport, generateLocalDraft } from "@/lib/local-ai";
import type { LocalGeneration } from "@/lib/local-ai-config";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { AI_BUSINESS_TOOLS, type AiBusinessToolConfig, type AiBusinessToolId } from "@/lib/ai-business-config";
import { getWorkflowGuide, workflowRevisionPrompt } from "@/lib/ai-workflows";
import { PLAN_ORDER } from "@/lib/plan-gating";
import type { PlanUsageSummary } from "@/lib/plan-gating";

type ToolResult = {
  generation?: LocalGeneration | null;
  tool: AiBusinessToolConfig;
  output: string;
  configured: boolean;
  model: string;
  reviewRequired: boolean;
};
const categories = Array.from(new Set(AI_BUSINESS_TOOLS.map(tool => tool.category)));

export function AiBusinessOSClient({ usage, aiStatus }: {
  usage: PlanUsageSummary;
  aiStatus: { enabled: boolean; hasApiKey: boolean; model: string };
}) {
  const [toolId, setToolId] = useState<AiBusinessToolId>("whatsapp_ordering_assistant");
  const [prompt, setPrompt] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [revision, setRevision] = useState("");
  const [draft, setDraft] = useState("");
  const [result, setResult] = useState<ToolResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const tool = AI_BUSINESS_TOOLS.find(item => item.id === toolId)!;
  const guide = getWorkflowGuide(toolId);
  const locked = PLAN_ORDER.indexOf(usage.planId) < PLAN_ORDER.indexOf(tool.requiredPlan);
  const aiMeter = usage.meters.find(meter => meter.key === "aiGenerations");
  const blocked = locked || !aiStatus.enabled || Boolean(aiMeter?.locked);

  function selectWorkflow(id: AiBusinessToolId) {
    active.current?.abort(); active.current = null;
    setBusy(false); setToolId(id); setPrompt(""); setExtraContext("");
    setDraft(""); setRevision(""); setResult(null); setMessage("");
  }

  async function runTool(refine = false) {
    if (busy || blocked || !prompt.trim() || (refine && (!draft.trim() || !revision.trim()))) return;
    const controller = new AbortController();
    active.current = controller;
    const previousDraft = draft;
    const previousResult = result;
    setBusy(true); setMessage("Preparing this workflow with your business records…");
    setResult(null); setDraft("");
    try {
      assertLocalAiSupport();
      const response = await fetch("/api/ai/tools", {
        method: "POST", signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: tool.id, prompt: refine ? workflowRevisionPrompt(prompt, previousDraft, revision) : prompt, extraContext })
      });
      const payload = await readApiPayload<ToolResult>(response);
      if (!response.ok || !payload.data) throw new Error(payload.error || "This workflow could not run.");
      if (!payload.data.generation) throw new Error("Local AI is disabled.");
      const current = () => active.current === controller;
      const output = await generateLocalDraft(payload.data.generation,
        text => { if (current()) setMessage(text); }, controller.signal,
        text => { if (current()) setDraft(text); });
      if (!current()) return;
      setDraft(output); setResult({ ...payload.data, generation: undefined, output });
      setRevision(""); setMessage("Draft ready for review. Check facts, edit the text, or ask AI for a change.");
    } catch (error) {
      if (active.current !== controller) return;
      // Keep the last usable draft if a revision fails or is stopped.
      setDraft(refine ? previousDraft : ""); setResult(refine ? previousResult : null);
      setMessage(controller.signal.aborted ? "Stopped. You can try again." : error instanceof Error ? error.message : "This workflow could not finish.");
    } finally {
      if (active.current === controller) { active.current = null; setBusy(false); }
    }
  }

  async function copyDraft() {
    try { await navigator.clipboard.writeText(draft); setMessage("Your edited draft was copied. Continue in the workspace when ready."); }
    catch { setMessage("Clipboard access is unavailable. Select and copy the draft text manually."); }
  }

  return <div className="grid min-w-0 max-w-full gap-5 [overflow-wrap:anywhere]">
    <Panel><div className="min-w-0 space-y-3 p-4 sm:p-5">
      <div className="flex flex-wrap gap-2"><Badge tone={aiStatus.enabled ? "green" : "amber"}>{aiStatus.enabled ? "Local browser AI" : "AI disabled"}</Badge><Badge tone="teal">{usage.planName}</Badge><Badge tone="neutral">AI usage: {aiMeter ? `${aiMeter.used}/${aiMeter.limit ?? "Unlimited"}` : "Unavailable"}</Badge></div>
      <h2 className="text-2xl font-black text-white">Work with AI</h2>
      <p className="text-sm leading-6 text-teal-50/75">Choose a workflow, prepare a draft with your business records, then refine and review it before continuing.</p>
      <ol aria-label="Workflow steps" className="flex flex-wrap gap-2 text-xs font-bold text-cyan-100">
        {["1 · Choose", "2 · Add details", "3 · Draft & refine", "4 · Review & continue"].map(step => <li key={step} className="rounded-lg border border-white/15 px-3 py-2">{step}</li>)}
      </ol>
      <p className="text-xs leading-5 text-teal-50/60">AI prepares suggestions. Sending messages, changing stock, dispatching orders, and saving records happen in the relevant workspace.</p>
    </div></Panel>

    <section className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <Panel className="hidden xl:block"><PanelHeader title="Workflows" description="Choose where you need help" />
        <nav aria-label="AI workflows" className="grid max-h-[720px] gap-2 overflow-y-auto p-3">
          {AI_BUSINESS_TOOLS.map(item => <button type="button" key={item.id} aria-pressed={item.id === toolId} onClick={() => selectWorkflow(item.id)} className={`min-w-0 rounded-xl border p-3 text-left ${item.id === toolId ? "border-cyan-200/50 bg-cyan-300/12" : "border-white/10 bg-white/[0.04]"}`}>
            <span className="block text-sm font-bold text-white">{item.shortTitle}</span><span className="text-xs text-teal-50/60">{item.category} · {item.requiredPlan}</span>
          </button>)}
        </nav>
      </Panel>
      <div className="grid min-w-0 gap-5">
        <Panel><PanelHeader title="Choose your workflow" description="Each workflow has its own starting point and workspace." />
          <div className="grid min-w-0 gap-4 p-4 sm:p-5">
            <SelectField id="ai-workflow" label="Workflow" value={toolId} onChange={event => selectWorkflow(event.target.value as AiBusinessToolId)}>
              {categories.map(category => <optgroup label={category} key={category}>{AI_BUSINESS_TOOLS.filter(item => item.category === category).map(item => <option value={item.id} key={item.id}>{item.shortTitle} · {item.requiredPlan}</option>)}</optgroup>)}
            </SelectField>
            <div><h3 className="font-bold text-white">{tool.title}</h3><p className="mt-1 text-sm leading-6 text-teal-50/70">{tool.description}</p></div>
            {locked ? <p className="rounded-xl bg-amber-300/10 p-3 text-sm text-amber-100"><LockKeyhole className="mr-2 inline h-4 w-4" />This workflow requires {tool.requiredPlan}. <Link className="underline" href="/subscription">View plans</Link></p> : null}
            {aiMeter?.locked ? <p className="text-sm text-amber-100">Your plan’s AI allowance is unavailable. Check your subscription before generating.</p> : null}
            <Button disabled={busy} onClick={() => { setPrompt(guide.goal); setResult(null); setDraft(""); setRevision(""); }} className="justify-self-start">Use suggested starting point</Button>
            <TextAreaField id="ai-workflow-prompt" label={tool.promptLabel} value={prompt} disabled={busy} onChange={event => setPrompt(event.target.value)} placeholder={tool.placeholder} rows={4} maxLength={1800} />
            <TextAreaField id="ai-workflow-context" label="Business details or instructions (optional)" value={extraContext} disabled={busy} onChange={event => setExtraContext(event.target.value)} placeholder="Add a deadline, tone, item, or order number. Saved business records are included automatically." rows={3} maxLength={600} />
            <p className="text-xs leading-5 text-teal-50/60">First use downloads about 300 MB. A compatible WebGPU device with enough memory is required. <Link className="text-cyan-200 underline" href="/ai-test">Check local AI</Link></p>
            <div className="flex flex-wrap gap-2"><Button variant="primary" disabled={busy || blocked || !prompt.trim()} onClick={() => runTool()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{busy ? "Working…" : "Generate workflow draft"}</Button>{busy ? <Button onClick={() => active.current?.abort()}>Stop</Button> : null}</div>
            {message ? <p role="status" aria-live="polite" className="rounded-xl border border-white/15 p-3 text-sm text-teal-50/80">{message}</p> : null}
          </div>
        </Panel>
        <Panel><PanelHeader title="Review and refine" description="Edit your draft or tell AI what to change." action={result ? <Badge tone="amber">Check facts before using</Badge> : null} />
          <div className="grid min-w-0 gap-4 p-4 sm:p-5">
            {draft || result || busy ? <TextAreaField id="ai-workflow-draft" label={busy ? "Draft in progress" : "Editable workflow draft"} value={draft} readOnly={busy} onChange={event => setDraft(event.target.value)} rows={10} className="leading-6" /> : <div className="rounded-xl border border-dashed border-white/20 p-6 text-center text-teal-50/65"><Bot className="mx-auto mb-2 h-7 w-7" />Choose a workflow and add the details to begin.</div>}
            {result ? <>
              <TextAreaField id="ai-workflow-revision" label="What should AI change?" value={revision} disabled={busy} onChange={event => setRevision(event.target.value)} placeholder="For example: shorten it, change the tone, or explain the assumptions." rows={3} maxLength={500} />
              <div className="flex flex-wrap gap-2"><Button disabled={busy || blocked || !revision.trim() || !draft.trim()} onClick={() => runTool(true)}>Revise with AI</Button><Button disabled={busy || !draft.trim()} onClick={copyDraft}><Clipboard className="h-4 w-4" />Copy edited draft</Button></div>
              <div className="rounded-xl border border-cyan-200/20 p-4"><p className="mb-3 text-sm leading-6 text-teal-50/75">Check product names, prices, quantities, dates, and customer details. Copy your draft and continue in the workspace to send or save it.</p><Link href={guide.workspace.href} className="inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-4 text-sm font-bold text-slate-950">{guide.workspace.label}</Link></div>
            </> : null}
          </div>
        </Panel>
      </div>
    </section>
  </div>;
}
