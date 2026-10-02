import assert from "node:assert/strict";
import { guardLocalTask, waitForWorkerReady } from "../lib/local-ai-lifecycle";
async function main() {
  const worker = new EventTarget() as unknown as Worker;
  const ready = waitForWorkerReady(worker, 1000);
  worker.dispatchEvent(new MessageEvent("message", { data: { type: "local-ai-ready" } }));
  await ready;
  await assert.rejects(waitForWorkerReady(worker, 5), /startup timed out/);
  const failed = waitForWorkerReady(worker, 1000);
  worker.dispatchEvent(new Event("error"));
  await assert.rejects(failed, /could not start/);
  const never = new Promise<string>(() => {});
  const controller = new AbortController();
  const stopped = guardLocalTask(never, worker, controller.signal, 1000, "timed out");
  controller.abort();
  await assert.rejects(stopped, /stopped/);
  await assert.rejects(guardLocalTask(never, worker, controller.signal, 1000, "timed out"), /stopped/);
  await assert.rejects(guardLocalTask(never, worker, undefined, 5, "generation timed out"), /generation timed out/);
  const broken = guardLocalTask(never, worker, undefined, 1000, "timed out");
  worker.dispatchEvent(new Event("messageerror"));
  await assert.rejects(broken, /worker failed/);
  assert.equal(await guardLocalTask(Promise.resolve("draft"), worker, undefined, 1000, "timed out"), "draft");
  console.log("Local worker readiness, worker failures, startup/generation timeouts, cancellation, and retry tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
