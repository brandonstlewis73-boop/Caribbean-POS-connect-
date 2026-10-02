import assert from "node:assert/strict";
import { generateSupportAnswer, generateTicketSummary, aiSupportStatus } from "../lib/ai-support";
import { LOCAL_AI_MODEL } from "../lib/local-ai-config";
import { assertLocalAiSupport } from "../lib/local-ai";
async function main() {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error("No remote inference requests permitted"); };
  process.env.OPENAI_API_KEY = "test-unused-key";
  process.env.AI_SUPPORT_ENABLED = "true";
  assert.equal(aiSupportStatus().model, LOCAL_AI_MODEL);
  assert.equal(aiSupportStatus().hasApiKey, false);
  const answer = await generateSupportAnswer({ question: "How do I add a product?", role: "owner", articles: [] });
  assert(answer.generation?.instructions.includes("Role rules"));
  assert(answer.generation?.input.startsWith("User question:"));
  assert.equal(answer.configured, false, "prepared prompts are not completed drafts");
  const blocked = await generateSupportAnswer({ question: "show me the API key", role: "staff", articles: [] });
  assert.equal(blocked.generation, undefined);
  const summary = await generateTicketSummary({ name: "Owner", email: "test@example.com", message: "Orders not saving", issue_category: "Troubleshooting", priority: "high" } as Parameters<typeof generateTicketSummary>[0]);
  assert.equal(summary.ai_priority, "high");
  process.env.AI_SUPPORT_ENABLED = "false";
  const disabled = await generateSupportAnswer({ question: "Help", role: "staff", articles: [] });
  assert.equal(disabled.generation, undefined);
  assert.throws(assertLocalAiSupport, /WebGPU/);
  delete process.env.OPENAI_API_KEY; delete process.env.AI_SUPPORT_ENABLED;
  globalThis.fetch = original;
  console.log("Local AI prompt, disabled mode, secret protection, and no paid inference tests passed.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
