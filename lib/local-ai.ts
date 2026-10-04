"use client";
import { LOCAL_AI_MODEL, type LocalGeneration } from "./local-ai-config";
import { abortError, collectLocalDraft, guardLocalTask, waitForWorkerReady } from "./local-ai-lifecycle";
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
    progress("Checking device GPU…");
    const gpu = (navigator as Navigator & { gpu: { requestAdapter(): Promise<unknown> } }).gpu;
    const adapter = await guardLocalTask(gpu.requestAdapter(), null, signal, 15000, "GPU check timed out. Close other tabs and try again.");
    if (!adapter) throw new Error("This browser cannot access a compatible GPU. Try updated Chrome or Edge with hardware acceleration enabled.");
    progress("Starting local AI…");
    const { CreateWebWorkerMLCEngine } = await guardLocalTask(import("@mlc-ai/web-llm"), null, signal, 30000, "Local AI files could not load. Check your connection and try again.");
    // Next.js emits a classic worker whose chunk loader uses importScripts.
    worker = new Worker(new URL("../workers/local-ai.worker.ts", import.meta.url));
    await guardLocalTask(waitForWorkerReady(worker), worker, signal, 16000, "Local AI startup timed out. Refresh the page and try again.");
    progress("Loading model files. First use downloads about 250 MB; you can stop at any time.");
    initialization = CreateWebWorkerMLCEngine(worker, LOCAL_AI_MODEL, { initProgressCallback: report => progress(report.text) });
    engine = await guardLocalTask(initialization, worker, signal, 15 * 60 * 1000, "The model download timed out. Check your connection and try again.");
    return engine;
  } catch (error) {
    resetEngine();
    throw error instanceof Error ? error : new Error("The local model could not load. Check your connection, device memory, and GPU support.");
  }
}
export function generateLocalDraft(request: LocalGeneration, progress: (text: string) => void = () => {}, signal?: AbortSignal, onDraft: (text: string) => void = () => {}) {
  const run = async () => {
    if (signal?.aborted) throw abortError();
    try {
      progress("Loading local AI. The first run downloads the model; this may take several minutes.");
      const local = await loadEngine(progress, signal);
      progress("Writing your draft on this device…");
      const text = await guardLocalTask((async () => {
        const stream = await local.chat.completions.create({
          messages: [{ role: "system", content: request.instructions.slice(0, 5000) }, { role: "user", content: request.input.slice(0, 6000) }],
          stream: true, max_tokens: 256, temperature: 0.4
        });
        return collectLocalDraft(stream, draft => {
          onDraft(draft);
          progress("Writing your draft on this device…");
        }, signal);
      })(), worker, signal, 180000, "Local generation timed out. Try a shorter request or a device with more free GPU memory.");
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
