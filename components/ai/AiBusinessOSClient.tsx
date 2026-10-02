"use client";

import { assertLocalAiSupport, generateLocalDraft } from "@/lib/local-ai";
import type { LocalGeneration } from "@/lib/local-ai-config";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Clipboard,
  Loader2,
  LockKeyhole,
  Send,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { AI_BUSINESS_TOOLS, type AiBusinessToolConfig, type AiBusinessToolId } from "@/lib/ai-business-config";
import type { PlanUsageSummary } from "@/lib/plan-gating";

type ToolResult = {
  generation?: LocalGeneration | null;
  tool: AiBusinessToolConfig;
  output: string;
  configured: boolean;
  model: string;
  reviewRequired: boolean;
};

const categoryTone: Record<string, "teal" | "green" | "amber" | "neutral"> = {
  Orders: "teal",
  Marketing: "green",
  Customers: "teal",
  Inventory: "amber",
  Delivery: "teal",
  Finance: "green",
  Operations: "neutral",
  Support: "neutral"
};

export function AiBusinessOSClient({
  usage,
  aiStatus
}: {
  usage: PlanUsageSummary;
  aiStatus: { enabled: boolean; hasApiKey: boolean; model: string };
}) {
  const [selectedToolId, setSelectedToolId] = useState<AiBusinessToolId>("whatsapp_ordering_assistant");
  const [prompt, setPrompt] = useState("");
  const [extraContext, setExtraContext] = useState("");
  const [result, setResult] = useState<ToolResult | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selectedTool = useMemo(
    () => AI_BUSINESS_TOOLS.find((tool) => tool.id === selectedToolId) || AI_BUSINESS_TOOLS[0],
    [selectedToolId]
  );
  const locked = useMemo(() => {
    const order = ["trial", "starter", "pro", "premium", "enterprise"];
    return order.indexOf(usage.planId) < order.indexOf(selectedTool.requiredPlan);
  }, [selectedTool.requiredPlan, usage.planId]);
  const aiMeter = usage.meters.find((meter) => meter.key === "aiGenerations");

  async function runTool() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setMessage("");
    setResult(null);
    try {
      assertLocalAiSupport();
      const response = await fetch("/api/ai/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: selectedTool.id, prompt, extraContext })
      });
      const payload = await readApiPayload<ToolResult>(response);
      if (!response.ok || !payload.data) throw new Error(payload.error || "AI tool could not run.");
      if (!payload.data.generation) throw new Error("Local AI is disabled.");
      const output = await generateLocalDraft(payload.data.generation, setMessage);
      setResult({ ...payload.data, generation: undefined, output, configured: true });
      setMessage("Local AI draft generated on this device. Review before using.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AI tool could not run.");
    } finally {
      setBusy(false);
    }
  }

  async function copyResult() {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setMessage("Draft copied. Review it before sending or saving.");
  }

  return (
    <div className="grid gap-5">
      <Panel>
        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={aiStatus.enabled ? "green" : "amber"}>
                {aiStatus.enabled ? "Local browser AI" : "AI disabled"}
              </Badge>
              <Badge tone="teal">{usage.planName}</Badge>
              <Badge tone={aiMeter?.locked ? "amber" : "neutral"}>
                AI usage: {aiMeter ? `${aiMeter.used}/${aiMeter.limit ?? "Unlimited"}` : "Unavailable"}
              </Badge>
            </div>
            <Link href="/ai-test" className="mt-3 inline-block text-sm font-bold text-cyan-200 underline">Test local AI</Link>
            <h2 className="mt-4 text-2xl font-black text-white">AI Business OS</h2>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-teal-50/65">
              Draft WhatsApp replies, promos, prep lists, dispatch plans, forecasts, loyalty ideas, and business advice using only this business account data.
            </p>
          </div>
          <div className="rounded-card border border-white/10 bg-black/20 p-4 text-sm font-semibold leading-6 text-teal-50/65">
            <p className="font-black text-white">Review required</p>
            <p className="mt-1">AI drafts are never sent, saved, posted, or applied automatically. A business owner or staff member must review every output first.</p>
          </div>
        </div>
      </Panel>

      <section className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel>
          <PanelHeader title="AI tools" description="Choose a workflow" />
          <div className="grid max-h-[760px] gap-2 overflow-y-auto p-3">
            {AI_BUSINESS_TOOLS.map((tool) => {
              const selected = tool.id === selectedTool.id;
              const order = ["trial", "starter", "pro", "premium", "enterprise"];
              const toolLocked = order.indexOf(usage.planId) < order.indexOf(tool.requiredPlan);
              return (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => {
                    setSelectedToolId(tool.id);
                    setResult(null);
                    setMessage("");
                    setPrompt("");
                  }}
                  className={[
                    "grid gap-2 rounded-card border p-3 text-left transition",
                    selected ? "border-cyan-200/50 bg-cyan-300/12" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white">{tool.shortTitle}</p>
                      <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-teal-50/55">{tool.description}</p>
                    </div>
                    {toolLocked ? <LockKeyhole className="h-4 w-4 shrink-0 text-amber-200" /> : <Sparkles className="h-4 w-4 shrink-0 text-cyan-200" />}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone={categoryTone[tool.category] || "neutral"}>{tool.category}</Badge>
                    <Badge tone={toolLocked ? "amber" : "green"}>{tool.requiredPlan}</Badge>
                  </div>
                </button>
              );
            })}
          </div>
        </Panel>

        <div className="grid gap-5">
          <Panel>
            <PanelHeader
              title={selectedTool.title}
              description={selectedTool.description}
              action={<Badge tone={locked ? "amber" : "green"}>{locked ? "Upgrade required" : "Ready"}</Badge>}
            />
            <div className="grid gap-4 p-5">
              {locked ? (
                <div className="rounded-card border border-amber-300/20 bg-amber-300/10 p-4">
                  <p className="font-black text-white">This tool starts on {selectedTool.requiredPlan}.</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-teal-50/65">
                    Your current plan is {usage.planName}. Upgrade to unlock this AI workflow while keeping all current data safe.
                  </p>
                  <Link href="/subscription" className="mt-4 inline-flex min-h-10 items-center justify-center rounded-card bg-cyan-300 px-4 text-sm font-black text-slate-950">
                    View upgrade options
                  </Link>
                </div>
              ) : null}
              {aiStatus.enabled ? (
                <div className="rounded-card border border-amber-300/20 bg-amber-300/10 p-4 text-sm font-semibold leading-6 text-amber-50">
                  First use downloads roughly 1 GB of model files and needs a compatible WebGPU device. Clicking Generate starts the download. Drafts run on this device without API fees.
                </div>
              ) : null}
              <TextAreaField
                label={selectedTool.promptLabel}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder={selectedTool.placeholder}
                rows={5}
              />
              <TextAreaField
                label="Extra context optional"
                value={extraContext}
                onChange={(event) => setExtraContext(event.target.value)}
                placeholder="Add tone, deadline, customer situation, or staff notes. Do not paste passwords or API keys."
                rows={3}
              />
              <Button type="button" variant="primary" disabled={busy || locked || !prompt.trim()} onClick={runTool} className="w-full sm:w-auto">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {busy ? "Generating..." : "Generate draft"}
              </Button>
              {message ? (
                <p className="rounded-card border border-white/10 bg-black/20 p-3 text-sm font-bold text-teal-50/70">{message}</p>
              ) : null}
            </div>
          </Panel>

          <Panel>
            <PanelHeader
              title="AI output"
              description="Review, edit, then send or apply manually"
              action={result ? <Badge tone="amber">Review required</Badge> : null}
            />
            <div className="p-5">
              {result ? (
                <div className="grid gap-4">
                  <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-card border border-white/10 bg-black/30 p-4 text-sm font-semibold leading-6 text-teal-50/80">
                    {result.output}
                  </pre>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="button" onClick={copyResult} className="w-full sm:w-auto">
                      <Clipboard className="h-4 w-4" />
                      Copy draft
                    </Button>
                    <span className="inline-flex min-h-10 items-center gap-2 rounded-card border border-emerald-300/20 bg-emerald-300/10 px-3 text-sm font-black text-emerald-100">
                      <CheckCircle2 className="h-4 w-4" />
                      Human approval needed
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid min-h-56 place-items-center rounded-card border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                  <div>
                    <Bot className="mx-auto h-8 w-8 text-cyan-200" />
                    <p className="mt-3 font-black text-white">No AI draft yet</p>
                    <p className="mt-2 text-sm font-semibold text-teal-50/55">Choose a tool, add context, and generate a reviewable draft.</p>
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </section>
    </div>
  );
}
