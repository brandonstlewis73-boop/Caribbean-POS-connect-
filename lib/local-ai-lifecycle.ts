export class LocalRepetitionError extends Error {
  constructor() { super("Local AI started repeating itself. The repeated response was stopped."); this.name = "LocalRepetitionError"; }
}
export function waitForWorkerReady(worker: Worker, timeoutMs = 15000): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onError);
      if (error) reject(error); else resolve();
    };
    const onMessage = (event: MessageEvent) => { if (event.data?.type === "local-ai-ready") finish(); };
    const onError = () => finish(new Error("The local AI worker could not start. Refresh the page and try again."));
    const timer = setTimeout(() => finish(new Error("Local AI startup timed out. Refresh the page and try again.")), timeoutMs);
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onError);
  });
}
export function abortError() { return new Error("Local AI stopped. You can try again when ready."); }
export function guardLocalTask<T>(task: Promise<T>, worker: Worker | null, signal: AbortSignal | undefined, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const finish = (error: unknown, value?: T) => {
      clearTimeout(timer); signal?.removeEventListener("abort", onAbort);
      worker?.removeEventListener("error", onError); worker?.removeEventListener("messageerror", onError);
      if (error) reject(error); else resolve(value as T);
    };
    const onAbort = () => finish(abortError());
    const onError = () => finish(new Error("The local AI worker failed. Refresh the page and try again."));
    const timer = setTimeout(() => finish(new Error(message)), timeoutMs);
    signal?.addEventListener("abort", onAbort, { once: true });
    worker?.addEventListener("error", onError); worker?.addEventListener("messageerror", onError);
    task.then(value => finish(null, value), error => finish(error));
    if (signal?.aborted) onAbort();
  });
}

export async function collectLocalDraft(
  stream: AsyncIterable<{ choices: { delta: { content?: string | null } }[] }>,
  onDraft: (text: string) => void,
  signal?: AbortSignal
) {
  let draft = "";
  for await (const chunk of stream) {
    if (signal?.aborted) throw abortError();
    draft += chunk.choices[0]?.delta.content || "";
    const sentences = draft.match(/[^.!?\n]+[.!?\n]/g) || [];
    const seen = new Set<string>();
    for (const sentence of sentences) {
      const normalized = sentence.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (normalized.length < 35) continue;
      if (seen.has(normalized)) throw new LocalRepetitionError();
      seen.add(normalized);
    }
    onDraft(draft);
  }
  return draft.trim();
}
