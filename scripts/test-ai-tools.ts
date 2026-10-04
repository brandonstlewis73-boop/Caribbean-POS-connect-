import { getWorkflowGuide, workflowRevisionPrompt, workflowRecordContext } from "../lib/ai-workflows";
import assert from "node:assert/strict";
import { AI_BUSINESS_TOOLS, getAiBusinessTool } from "../lib/ai-business-config";
import { PLAN_ORDER } from "../lib/plan-gating";

assert.equal(AI_BUSINESS_TOOLS.length, 19);
assert.equal(getAiBusinessTool("whatsapp_ordering_assistant")?.requiredPlan, "pro");
assert.equal(getAiBusinessTool("delivery_dispatcher")?.requiredPlan, "premium");
assert.equal(getAiBusinessTool("smart_upsell_checkout")?.category, "Orders");

const ids = new Set(AI_BUSINESS_TOOLS.map((tool) => tool.id));
assert.equal(ids.size, AI_BUSINESS_TOOLS.length);

for (const tool of AI_BUSINESS_TOOLS) {
  assert.ok(tool.title.length > 4, `${tool.id} needs a title`);
  assert.ok(tool.description.length > 12, `${tool.id} needs a description`);
  assert.ok(tool.placeholder.length > 12, `${tool.id} needs a placeholder`);
  assert.ok(PLAN_ORDER.includes(tool.requiredPlan), `${tool.id} has invalid plan`);
}

console.log("AI business tool config tests passed.");

const fullCatalog = "catalog-record ".repeat(500);
const context = workflowRecordContext("Delivery", { products: fullCatalog, orders: "Order #1060: preparing", customers: "Private customer" });
assert(context.includes("#1060"));
assert(!context.includes("catalog-record"));
assert(!context.includes("Private customer"));
assert.equal(workflowRecordContext("Support", { products: fullCatalog, orders: "Private order", customers: "Private customer" }), "");
const revision = workflowRevisionPrompt("Goal".repeat(1000), "Original draft".repeat(1000), "Make this shorter".repeat(100));
assert(revision.length <= 1800);
assert(revision.includes("Requested changes:"));
for (const tool of AI_BUSINESS_TOOLS) {
  const guide = getWorkflowGuide(tool.id);
  assert(guide.goal.length > 30);
  assert(guide.workspace.href.startsWith("/"));
}
console.log("Workflow guides, relevant record selection, and bounded revision tests passed.");
