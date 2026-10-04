"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { assertLocalAiSupport, generateLocalDraft } from "@/lib/local-ai";
import { orderDelayReviewText, type OrderDelayReview } from "@/lib/ai-order-delays";
import type { LocalGeneration } from "@/lib/local-ai-config";
import { readApiPayload } from "@/lib/client-response";
import { AI_BUSINESS_TOOLS, type AiBusinessToolId } from "@/lib/ai-business-config";
import { PLAN_ORDER, type PlanUsageSummary } from "@/lib/plan-gating";
import { workflowRevisionPrompt } from "@/lib/ai-workflows";
import { friendlyAiProgress, usesProductSelection, workflowName } from "@/lib/ai-workspace-presentation";
import type { AiWorkspaceResources } from "@/lib/ai-workspace-types";

type Thread = { input: string; goal: string; requests: string[]; output: string;
  review: OrderDelayReview | null; completed: boolean; productId: string; resultProductId: string; saved: boolean };
const emptyThread = (): Thread => ({ review: null, input: "", goal: "", requests: [], output: "", completed: false, productId: "", resultProductId: "", saved: false });

export function useAiWorkspace(usage: PlanUsageSummary, enabled: boolean) {
  const [toolId, setToolId] = useState<AiBusinessToolId>("product_description_writer");
  const [threads, setThreads] = useState<Partial<Record<AiBusinessToolId, Thread>>>({});
  const [resources, setResources] = useState<AiWorkspaceResources | null>(null);
  const [resourceMessage, setResourceMessage] = useState("");
  const [loadingResources, setLoadingResources] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [recordConflict, setRecordConflict] = useState(false);
  const [recordsReloaded, setRecordsReloaded] = useState(false);
  const [meter, setMeter] = useState(usage.meters.find(item => item.key === "aiGenerations"));
  const active = useRef<AbortController | null>(null);
  const pending = useRef<{ id: AiBusinessToolId; previous: Thread } | null>(null);
  const mounted = useRef(true);
  const composer = useRef<HTMLTextAreaElement | null>(null);
  const thread = threads[toolId] || emptyThread();
  const tool = AI_BUSINESS_TOOLS.find(item => item.id === toolId)!;
  const locked = PLAN_ORDER.indexOf(usage.planId) < PLAN_ORDER.indexOf(tool.requiredPlan);
  const blocked = locked || !enabled || Boolean(meter?.locked);
  const product = resources?.products.find(item => item.id === thread.productId);
  const changeThread = (id: AiBusinessToolId, changes: Partial<Thread>) =>
    setThreads(current => ({ ...current, [id]: { ...(current[id] || emptyThread()), ...changes } }));

  const loadResources = useCallback(async (signal?: AbortSignal) => {
    setLoadingResources(true); setResourceMessage("");
    try {
      const response = await fetch("/api/ai/workspace", { signal, cache: "no-store" });
      const payload = await readApiPayload<AiWorkspaceResources>(response);
      if (!response.ok || !payload.data) throw new Error(payload.error || "Product records could not be loaded.");
      if (mounted.current && !signal?.aborted) { setResources(payload.data); return true; }
    } catch (e) {
      if (mounted.current && !signal?.aborted) setResourceMessage(e instanceof Error ? e.message : "Product records could not be loaded.");
      return false;
    } finally { if (mounted.current && !signal?.aborted) setLoadingResources(false); }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    if (enabled && PLAN_ORDER.indexOf(usage.planId) >= PLAN_ORDER.indexOf("pro")) void loadResources(controller.signal);
    return () => { mounted.current = false; controller.abort(); active.current?.abort(); };
  }, [enabled, usage.planId, loadResources]);

  function cancelForSwitch() {
    active.current?.abort(); active.current = null;
    if (pending.current) changeThread(pending.current.id, pending.current.previous);
    pending.current = null; setBusy(false);
  }
  function selectWorkflow(id: AiBusinessToolId) {
    if (saving) return;
    cancelForSwitch(); setRecordConflict(false); setRecordsReloaded(false); setToolId(id); setStatus(""); setError("");
  }
  function chooseProduct(id: string) {
    if (saving) return;
    cancelForSwitch();
    setRecordConflict(false); setRecordsReloaded(false);
    changeThread(toolId, { ...emptyThread(), productId: id }); setStatus(""); setError("");
  }
  function setInput(input: string) { changeThread(toolId, { input }); }
  function setOutput(output: string) { changeThread(toolId, { output, saved: false }); }
  function startWith(input: string) { setInput(input); composer.current?.focus(); }

  async function run() {
    const input = thread.input.trim();
    if (!input || busy || saving || blocked) return;
    if (usesProductSelection(toolId) && !product) { setError("Choose a product for this request."); return; }
    const id = toolId;
    let freshReview: OrderDelayReview | null = null;
    const previous = thread;
    pending.current = { id, previous };
    const controller = new AbortController(); active.current = controller;
    const current = () => mounted.current && active.current === controller;
    setBusy(true); setError(""); setStatus("Connecting your business context…");
    changeThread(id, { input: "", output: "", review: null, completed: false, saved: false, requests: [...thread.requests, input] });
    try {
      if (id !== "order_delay_detector") assertLocalAiSupport();
      const response = await fetch("/api/ai/tools", {
        method: "POST", signal: controller.signal, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId: id, selectedProductId: product?.id,
          prompt: previous.completed ? workflowRevisionPrompt(previous.goal, previous.output, input) : input })
      });
      const payload = await readApiPayload<{ generation?: LocalGeneration; orderReview?: OrderDelayReview }>(response);
      if (!response.ok || !payload.data) throw new Error(payload.error || "Your assistant could not start this request.");
      if (!current()) return;
      freshReview = payload.data.orderReview || null;
      if (freshReview) {
        changeThread(id, { review: freshReview });
        if (pending.current && !previous.completed) pending.current.previous = { ...previous, review: freshReview };
      }
      if (!payload.data.generation && freshReview) {
        changeThread(id, { review: freshReview, completed: true, output: "", goal: previous.goal || input });
        setStatus("Order review updated."); return;
      }
      if (!payload.data.generation) throw new Error("Your assistant could not prepare this request.");
      if (id === "order_delay_detector") assertLocalAiSupport();
      const output = await generateLocalDraft(payload.data.generation,
        text => { if (current()) setStatus(friendlyAiProgress(text)); }, controller.signal,
        text => { if (current()) changeThread(id, { output: text }); });
      if (!current()) return;
      changeThread(id, { output, completed: true, goal: previous.goal || input, resultProductId: product?.id || "" });
      setStatus("");
    } catch (e) {
      if (!current()) return;
      changeThread(id, { ...previous, input, review: previous.completed ? previous.review : freshReview });
      setError(controller.signal.aborted ? "Request stopped. Your previous response is still available." : e instanceof Error ? e.message : "Your assistant could not complete the request.");
      setStatus("");
    } finally {
      if (current()) { active.current = null; pending.current = null; setBusy(false); }
      if (mounted.current) {
        // Refresh the real server allowance; failed device generation also consumes a prepared request.
        void fetch("/api/ai/tools").then(response => readApiPayload<{ usage: PlanUsageSummary }>(response))
          .then(payload => { if (mounted.current && payload.data?.usage) setMeter(payload.data.usage.meters.find(item => item.key === "aiGenerations")); }).catch(() => {});
      }
    }
  }

  async function saveProduct() {
    if (saving || busy || !thread.completed || !thread.output.trim() || !product ||
      toolId !== "product_description_writer" || thread.resultProductId !== product.id || !resources?.canSaveProducts) return;
    setSaving(true); setRecordConflict(false); setError(""); setStatus(`Saving to ${product.name}…`);
    try {
      const response = await fetch("/api/ai/actions/product-description", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, description: thread.output, expectedDescription: product.description })
      });
      const payload = await readApiPayload<{ saved: boolean; product: { description: string } }>(response);
      if (!response.ok || !payload.data?.saved) {
        setRecordConflict(response.status === 409);
        throw new Error(payload.error || "This description could not be saved.");
      }
      if (!mounted.current) return;
      setResources(current => current ? { ...current, products: current.products.map(item => item.id === product.id ? { ...item, description: payload.data!.product.description } : item) } : current);
      changeThread(toolId, { output: payload.data.product.description, saved: true }); setRecordsReloaded(false);
      setStatus(`Description saved to ${product.name}.`);
    } catch (e) { if (mounted.current) { setStatus(""); setError(e instanceof Error ? e.message : "This description could not be saved."); } }
    finally { if (mounted.current) setSaving(false); }
  }
  async function reloadAfterConflict() {
    if (saving || loadingResources) return;
    const loaded = await loadResources();
    if (loaded && mounted.current) {
      setRecordConflict(false); setRecordsReloaded(true); setError("");
      setStatus("Product records reloaded. Review the current saved description before saving your response.");
    }
  }
  const exportText = () => [thread.review ? orderDelayReviewText(thread.review) : "", thread.completed ? thread.output : ""].filter(Boolean).join("\n\nSuggested next steps\n");
  async function copy() {
    try { await navigator.clipboard.writeText(exportText()); setStatus("Copied to clipboard."); setError(""); }
    catch { setError("Clipboard access is unavailable. Use Edit to select and copy the text."); }
  }
  function download() {
    const blob = new Blob([`${workflowName(toolId)}\n\n${exportText()}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `${toolId}-result.txt`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000); setStatus("Result downloaded.");
  }
  return { toolId, tool, thread, product, resources, resourceMessage, loadingResources, busy, saving,
    status, error, recordConflict, recordsReloaded, reloadAfterConflict, meter, locked, blocked, composer, selectWorkflow, chooseProduct, setInput, setOutput,
    startWith, run, stop: () => {
      cancelForSwitch(); setStatus("");
      setError("Request stopped. Your previous response is still available.");
    }, saveProduct, copy, download,
    reloadResources: () => loadResources() };
}
