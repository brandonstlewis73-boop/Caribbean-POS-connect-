"use client";
import { localModelId, readLocalModelChoice, type LocalModelChoice, type LocalGeneration } from "./local-ai-config";
import { abortError, collectLocalDraft, guardLocalTask, waitForWorkerReady } from "./local-ai-lifecycle";
import { checkedLocalDraft, localDraftInstructions, localDraftInput, LocalDraftQualityError } from "./local-ai-quality";
import type { WebWorkerMLCEngine } from "@mlc-ai/web-llm";
let engine: WebWorkerMLCEngine | null = null;
let loadedChoice: LocalModelChoice | null = null;
let initialization: Promise<WebWorkerMLCEngine> | null = null;
let worker: Worker | null = null;
let queue: Promise<unknown> = Promise.resolve();
function resetEngine() { worker?.terminate(); worker = null; engine = null; initialization = null; loadedChoice = null; }
export function assertLocalAiSupport() {
  if (typeof window === "undefined" || !window.isSecureContext || !(navigator as Navigator & { gpu?: unknown }).gpu) {
    throw new Error("Local AI needs a browser with WebGPU over HTTPS. On iPhone, use Safari on iOS 26 or newer and open this site directly in Safari. On a computer, use updated Chrome or Edge. No paid AI service will be used.");
  }
}
async function loadEngine(progress: (text: string) => void, signal: AbortSignal | undefined, choice: LocalModelChoice) {
  assertLocalAiSupport();
  if (signal?.aborted) throw abortError();
  if (engine && loadedChoice === choice) return engine;
  if (engine) resetEngine();
  try {
    progress("Checking device GPU…");
    const gpu = (navigator as Navigator & { gpu: { requestAdapter(): Promise<{ features?: { has(name: string): boolean } } | null> } }).gpu;
    const adapter = await guardLocalTask(gpu.requestAdapter(), null, signal, 15000, "GPU check timed out. Close other tabs and try again.");
    if (!adapter) throw new Error("This browser cannot access a compatible GPU. On iPhone, open the site directly in Safari on iOS 26 or newer. Close other tabs and apps, then try again.");
    progress("Starting local AI…");
    const { CreateWebWorkerMLCEngine } = await guardLocalTask(import("@mlc-ai/web-llm"), null, signal, 30000, "Local AI files could not load. Check your connection and try again.");
    // Next.js emits a classic worker whose chunk loader uses importScripts.
    worker = new Worker(new URL("../workers/local-ai.worker.ts", import.meta.url));
    await guardLocalTask(waitForWorkerReady(worker), worker, signal, 16000, "Local AI startup timed out. Refresh the page and try again.");
    const modelId = localModelId(choice, adapter.features?.has("shader-f16") === true);
    progress(`Loading model files. First use downloads about ${choice === "quality" ? "870" : "300"} MB; you can stop at any time.`);
    initialization = CreateWebWorkerMLCEngine(worker, modelId, { initProgressCallback: report => progress(report.text) }, { context_window_size: 2048 });
    engine = await guardLocalTask(initialization, worker, signal, 15 * 60 * 1000, "The model download timed out. Check your connection and try again.");
    loadedChoice = choice;
    return engine;
  } catch (error) {
    resetEngine();
    throw error instanceof Error ? error : new Error(choice === "quality" ? "The higher-quality model could not load on this device. In Device AI, choose Lightweight and try again. Close other tabs to free memory." : "The lightweight model could not load. Check your connection and available memory, and open directly in Safari on iOS 26 or newer.");
  }
}
export function generateLocalDraft(request: LocalGeneration, progress: (text: string) => void = () => {}, signal?: AbortSignal, onDraft: (text: string) => void = () => {}, choice: LocalModelChoice = readLocalModelChoice()) {
  const run = async () => {
    if (signal?.aborted) throw abortError();
    try {
      progress("Loading local AI. The first run downloads the model; this may take several minutes.");
      const local = await loadEngine(progress, signal, choice);
      progress("Writing your draft on this device…");
      const text = await checkedLocalDraft(request, async repair => {
        return guardLocalTask((async () => {
          const stream = await local.chat.completions.create({
            messages: [
              { role: "system", content: localDraftInstructions(request) },
              { role: "user", content: localDraftInput(request, repair) }
            ],
            stream: true, max_tokens: request.purpose === "product-description" ? 96 : 256, temperature: request.purpose === "product-description" ? 0 : 0.2, repetition_penalty: 1.12, frequency_penalty: 0.3
          });
          return collectLocalDraft(stream, draft => {
            onDraft(draft);
            progress("Writing draft—checking before it is ready…");
          }, signal);
        })(), worker, signal, 180000, "Local generation timed out. Try a shorter request or a device with more free GPU memory.");
      }, () => {
        local.interruptGenerate();
        onDraft("");
        progress("The first draft missed the request. Trying one correction…");
      });
      return text;
    } catch (error) {
      if (!(error instanceof LocalDraftQualityError)) resetEngine();
      throw error instanceof Error ? error : new Error("Local AI could not finish this draft. No paid AI service was used.");
    }
  };
  const result = queue.then(run);
  queue = result.catch(() => {});
  return result;
}
