"use client";
import { LOCAL_AI_MODEL, type LocalGeneration } from "./local-ai-config";
import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
let engine: WebWorkerMLCEngine | null = null;
let initialization: Promise<WebWorkerMLCEngine> | null = null;
let worker: Worker | null = null;
let queue: Promise<unknown> = Promise.resolve();
export function assertLocalAiSupport() {
  if (typeof window === "undefined" || !window.isSecureContext || !(navigator as Navigator & { gpu?: unknown }).gpu) {
    throw new Error("Local AI needs a browser with WebGPU over HTTPS. Try an updated Chrome or Edge browser on a compatible computer. No paid AI service will be used.");
  }
}
async function loadEngine(progress: (text: string) => void) {
  assertLocalAiSupport();
  if (engine) return engine;
  if (!initialization) {
    initialization = (async () => {
      const { CreateWebWorkerMLCEngine } = await import("@mlc-ai/web-llm");
      worker = new Worker(new URL("../workers/local-ai.worker.ts", import.meta.url), { type: "module" });
      return CreateWebWorkerMLCEngine(worker, LOCAL_AI_MODEL, { initProgressCallback: report => progress(report.text) });
    })();
  }
  try { engine = await initialization; return engine; }
  catch {
    worker?.terminate(); worker = null; engine = null; initialization = null;
    throw new Error("The local model could not load. Check your connection, free device memory, and browser GPU support, then try again. No paid AI request was made.");
  }
}
export function generateLocalDraft(request: LocalGeneration, progress: (text: string) => void = () => {}) {
  const run = async () => {
    progress("Loading local AI. The first run downloads the model; this may take several minutes.");
    const local = await loadEngine(progress);
    progress("Writing your draft on this device…");
    try {
      const result = await local.chat.completions.create({ messages: [{ role: "system", content: request.instructions.slice(0, 5000) }, { role: "user", content: request.input.slice(0, 6000) + "\n/no_think" }], max_tokens: 700, temperature: 0.4, extra_body: { enable_thinking: false } });
      const text = result.choices[0]?.message.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (!text) throw new Error("No draft returned");
      return text;
    } catch {
      worker?.terminate(); worker = null; engine = null; initialization = null;
      throw new Error("Local AI could not finish this draft. Try a shorter request or reload the page. No paid AI service was used."); }
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}
