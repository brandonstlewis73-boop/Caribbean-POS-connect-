"use client";
import { LOCAL_AI_MODEL, type LocalGeneration } from "./local-ai-config";
import { abortError, guardLocalTask, waitForWorkerReady } from "./local-ai-lifecycle";
import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
let engine: WebWorkerMLCEngine | null = null;
let initialization: Promise<WebWorkerMLCEngine> | null = null;
let worker: Worker | null = null;
let queue: Promise<unknown> = Promise.resolve();
function resetEngine() { worker?.terminate(); worker = null; engine = null; initialization = null; }
export function assertLocalAiSupport() {
  if (typeof window === "undefined" || !window.isSecureContext || !(navigator as Navigator & { gpu?: unknown }).gpu) {
    throw new Error("Local AI needs a browser with WebGPU over HTTPS. Try an updated Chrome or Edge browser on a compatible computer. No paid AI service will be used.");
  }
}
async function loadEngine(progress: (text: string) => void, signal?: AbortSignal) {
  assertLocalAiSupport();
  if (signal?.aborted) throw abortError();
  if (engine) return engine;
  try {
    progress("Starting local AI…");
    const { CreateWebWorkerMLCEngine } = await guardLocalTask(import("@mlc-ai/web-llm"), null, signal, 30000, "Local AI files could not load. Check your connection and try again.");
    // Next.js emits a classic worker whose chunk loader uses importScripts.
    worker = new Worker(new URL("../workers/local-ai.worker.ts", import.meta.url));
    await guardLocalTask(waitForWorkerReady(worker), worker, signal, 16000, "Local AI startup timed out. Refresh the page and try again.");
    progress("Loading model files. First use downloads roughly 1 GB; you can stop at any time.");
    initialization = CreateWebWorkerMLCEngine(worker, LOCAL_AI_MODEL, { initProgressCallback: report => progress(report.text) });
    engine = await guardLocalTask(initialization, worker, signal, 15 * 60 * 1000, "The model download timed out. Check your connection and try again.");
    return engine;
  } catch (error) {
    resetEngine();
    throw error instanceof Error ? error : new Error("The local model could not load. Check your connection, device memory, and GPU support.");
  }
}
export function generateLocalDraft(request: LocalGeneration, progress: (text: string) => void = () => {}, signal?: AbortSignal) {
  const run = async () => {
    if (signal?.aborted) throw abortError();
    try {
      progress("Loading local AI. The first run downloads the model; this may take several minutes.");
      const local = await loadEngine(progress, signal);
      progress("Writing your draft on this device…");
      const result = await guardLocalTask(local.chat.completions.create({ messages: [{ role: "system", content: request.instructions.slice(0, 5000) }, { role: "user", content: request.input.slice(0, 6000) + "\n/no_think" }], max_tokens: 700, temperature: 0.4, extra_body: { enable_thinking: false } }), worker, signal, 180000, "Local generation timed out. Try a shorter request or a device with more free GPU memory.");
      const text = result.choices[0]?.message.content?.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      if (!text) throw new Error("Local AI returned no draft. Try a shorter request.");
      return text;
    } catch (error) {
      resetEngine();
      throw error instanceof Error ? error : new Error("Local AI could not finish this draft. No paid AI service was used.");
    }
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}
