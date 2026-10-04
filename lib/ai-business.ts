import "server-only";
import { prepareProductPromotion } from "./ai-promotion";
import { hasPermission } from "./permissions";
import { workflowRecordContext } from "./ai-workflows";
import { LOCAL_AI_MODEL, localAiEnabled } from "./local-ai-config";
import { AI_BUSINESS_TOOLS, getAiBusinessTool, type AiBusinessToolId } from "./ai-business-config";
import { money } from "./constants";
import { createId, query } from "./db";
import {
  PlanGateError,
  assertFeatureAccess,
  assertUsageLimit,
  getBusinessSettings,
  getProduct,
  getDashboardData,
  getPlanUsageSummary,
  listCustomers,
  listOrders,
  listProducts
} from "./data";
import { PLAN_CONFIG, PLAN_ORDER, type PlanId } from "./plan-gating";
import { redactSensitiveText } from "./ai-support";
import type { Customer, Order, Product, Settings, User } from "./types";

type AiToolRunInput = {
  toolId: AiBusinessToolId;
  prompt: string;
  extraContext?: string | null;
  selectedProductId?: string;
};

type BusinessAiContext = {
  settings: Settings;
  products: Product[];
  orders: Order[];
  customers: Customer[];
  dashboard: Awaited<ReturnType<typeof getDashboardData>>;
};

function aiEnabled() { return localAiEnabled(); }
function aiModel() { return LOCAL_AI_MODEL; }

function planRank(plan: PlanId) {
  return PLAN_ORDER.indexOf(plan);
}

function assertToolPlan(currentPlan: PlanId, requiredPlan: PlanId) {
  if (planRank(currentPlan) < planRank(requiredPlan)) {
    throw new PlanGateError(`Upgrade to ${PLAN_CONFIG[requiredPlan].name} to use this AI tool.`, {
      planId: currentPlan,
      requiredPlan,
      feature: "aiSupport"
    });
  }
}

function summarizeProducts(products: Product[], settings: Settings) {
  if (!products.length) return "No products are currently saved for this business.";
  return products.slice(0, 40).map((product) => {
    const margin = Number(product.selling_price || 0) - Number(product.cost_price || 0);
    return [
      product.name,
      `category ${product.category || "Uncategorized"}`,
      `price ${money(product.selling_price, settings.currency)}`,
      `cost ${money(product.cost_price, settings.currency)}`,
      `margin ${money(margin, settings.currency)}`,
      `stock ${product.stock_quantity}`,
      product.low_stock_alert !== undefined ? `low alert ${product.low_stock_alert}` : null,
      product.active ? "available" : "unavailable"
    ].filter(Boolean).join(" | ");
  }).join("\n");
}

function summarizeOrders(orders: Order[], settings: Settings) {
  if (!orders.length) return "No recent orders are currently saved for this business.";
  return orders.slice(0, 35).map((order) => {
    const items = order.items.map((item) => `${item.quantity}x ${item.product_name}`).join(", ");
    return [
      `#${order.order_number}`,
      `status ${order.status}`,
      `type ${order.order_type}`,
      `delivery ${order.delivery_status}`,
      `customer ${order.customer_snapshot.name || "Customer"}`,
      `total ${money(order.total, settings.currency)}`,
      `created ${order.created_at}`,
      items ? `items ${items}` : null,
      order.waze_link ? "has Waze link" : null,
      order.google_maps_link ? "has Google Maps link" : null
    ].filter(Boolean).join(" | ");
  }).join("\n");
}

function summarizeCustomers(customers: Customer[], settings: Settings) {
  if (!customers.length) return "No customers are currently saved for this business.";
  return customers.slice(0, 30).map((customer) => {
    return [
      customer.name,
      `orders ${customer.orders_count}`,
      `spent ${money(customer.total_spent, settings.currency)}`,
      customer.last_order_at ? `last order ${customer.last_order_at}` : null,
      customer.tags?.length ? `tags ${customer.tags.join(", ")}` : null,
      customer.city ? `city ${customer.city}` : null
    ].filter(Boolean).join(" | ");
  }).join("\n");
}

async function getBusinessAiContext(businessId: string): Promise<BusinessAiContext> {
  const [settings, products, orders, customers, dashboard] = await Promise.all([
    getBusinessSettings(businessId),
    listProducts(undefined, true, businessId),
    listOrders({ businessId, limit: 60 }),
    listCustomers(undefined, businessId),
    getDashboardData(businessId)
  ]);
  return { settings, products, orders, customers, dashboard };
}

function buildContextBlock(context: BusinessAiContext, toolId: AiBusinessToolId) {
  const { settings, products, orders, customers, dashboard } = context;
  return `
Business:
- Name: ${settings.business_name}
- Type: ${settings.business_type || "Not set"}
- Country: ${settings.business_country || "Trinidad and Tobago"}
- Currency: ${settings.currency}
- Delivery enabled: ${settings.delivery_enabled ? "yes" : "no"}
- Pickup enabled: ${settings.pickup_enabled ? "yes" : "no"}

Current performance:
- Today sales: ${money(dashboard.dailySales, settings.currency)}
- Weekly sales: ${money(dashboard.weeklySales, settings.currency)}
- Monthly sales: ${money(dashboard.monthlySales, settings.currency)}
- Pending orders: ${dashboard.pendingOrders}
- New orders: ${dashboard.newOrders}
- Completed orders: ${dashboard.completedOrders}
- Estimated profit: ${money(dashboard.profitEstimate, settings.currency)}

${workflowRecordContext(getAiBusinessTool(toolId)!.category, {
  products: summarizeProducts(products, settings),
  orders: summarizeOrders(orders, settings),
  customers: summarizeCustomers(customers, settings)
})}
`;
}

function toolInstructions(toolId: AiBusinessToolId) {
  const tool = getAiBusinessTool(toolId);
  return `
You are Caribbean POS Connect AI Business OS.
Active tool: ${tool?.title || toolId}.

Rules:
- Use only the provided business context and the user's request.
- Do not invent customers, orders, revenue, products, locations, or credentials.
- Never reveal API keys, database URLs, passwords, tokens, or environment variables.
- Keep tenant data isolated. You are only given one business context.
- Every output is a draft for human review. Do not say it was sent, saved, applied, dispatched, or posted.
- For WhatsApp, SMS, email, promos, review replies, and customer messages, provide draft copy only.
- For forecasts and profit advice, explain assumptions and mark them as estimates.
- For receipt scanner and expense tracker, extract a reviewable draft, not a final accounting entry.
- Use Caribbean small-business language where helpful, but keep it professional.
- Be concise, practical, and mobile-readable.

${["whatsapp_ordering_assistant", "missed_call_responder", "product_description_writer", "promo_generator", "review_reply_generator", "caribbean_business_mode"].includes(toolId)
  ? "Return only the requested message or description, ready for the user to edit. Do not include explanations or review notes in customer-facing copy."
  : "Return a concise workflow plan or structured draft, followed by assumptions and details to verify. Do not claim any action has been completed."}
`;
}

function fallbackOutput(toolId: AiBusinessToolId, prompt: string, context: BusinessAiContext) {
  const tool = getAiBusinessTool(toolId);
  const settings = context.settings;
  return [
    "Recommended draft",
    `${tool?.title || "AI tool"} is not configured for live AI generation yet. Based on saved business data, review your current products, active orders, customer list, and ${settings.currency} pricing before using this workflow.`,
    "",
    "Why this helps",
    "This keeps the workflow available without exposing API keys or inventing production data.",
    "",
    "Review before using",
    `Load the local model in a compatible browser, then run this again. Your request was: ${prompt.slice(0, 300)}`
  ].join("\n");
}

async function logAiBusinessRun(input: {
  userId: string;
  businessId: string;
  toolId: string;
  prompt: string;
  output: string;
  configured: boolean;
}) {
  try {
    await query(
      `INSERT INTO ai_business_logs (id, business_id, user_id, tool_id, prompt, output_preview, configured)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        createId("aib"),
        input.businessId,
        input.userId,
        input.toolId,
        redactSensitiveText(input.prompt).slice(0, 1200),
        redactSensitiveText(input.output).slice(0, 1200),
        input.configured
      ]
    );
  } catch (error) {
    console.info("AI business log skipped", { toolId: input.toolId, reason: error instanceof Error ? error.message : "Unknown" });
  }
}

export async function runAiBusinessTool(user: User, input: AiToolRunInput) {
  const tool = getAiBusinessTool(input.toolId);
  if (!tool) throw new Error("Unknown AI tool.");
  if (!input.prompt?.trim()) throw new Error("Tell the AI what you want help with.");
  const businessId = user.business_id;
  if (!businessId) throw new Error("Business account is required for AI tools.");

  await assertFeatureAccess(businessId, "aiSupport");
  await assertUsageLimit(businessId, "aiGenerations", 1);
  const usage = await getPlanUsageSummary(businessId);
  assertToolPlan(usage.planId, tool.requiredPlan);

  const context = await getBusinessAiContext(businessId);
  if (input.selectedProductId && !hasPermission(user.role, "inventory:read")) throw new Error("You do not have permission to use product records.");
  const selectedProduct = input.selectedProductId ? await getProduct(input.selectedProductId, businessId) : null;
  if (input.selectedProductId && !selectedProduct) throw new Error("The selected product is not available in this business.");
  const selectedProductText = selectedProduct
    ? `Selected product (use this product only):\n${redactSensitiveText([
        selectedProduct.name, `Category: ${selectedProduct.category}`,
        `Price: ${money(selectedProduct.selling_price, context.settings.currency)}`,
        `Stock: ${selectedProduct.stock_quantity}`,
        `Existing description: ${selectedProduct.description || "Not provided"}`
      ].join("\n")).slice(0, 1200)}\n\n`
    : "";
  const cleanPrompt = redactSensitiveText(input.prompt);
  const cleanExtra = redactSensitiveText(input.extraContext || "");
  const inputText = `User request:\n${cleanPrompt.slice(0, 1800)}\n\nExtra context:\n${cleanExtra.slice(0, 600)}\n\n${selectedProductText}Business context (selected records):\n${redactSensitiveText(selectedProduct ? `Business: ${context.settings.business_name}\nCountry: ${context.settings.business_country}\nCurrency: ${context.settings.currency}` : buildContextBlock(context, input.toolId)).slice(0, 3500)}`;
  const configured = false;
  const output = aiEnabled() ? "Local generation prepared. The draft is generated on your device and is not stored in server logs." : redactSensitiveText(fallbackOutput(input.toolId, cleanPrompt, context));

  await logAiBusinessRun({
    userId: user.id,
    businessId,
    toolId: tool.id,
    prompt: cleanPrompt,
    output,
    configured
  });

  return {
    tool,
    generation: aiEnabled() ? (input.toolId === "promo_generator" && selectedProduct
      ? prepareProductPromotion(cleanPrompt + (cleanExtra ? `\nAdditional instructions: ${cleanExtra}` : ""), {
          productName: redactSensitiveText(selectedProduct.name),
          priceText: money(selectedProduct.selling_price, context.settings.currency),
          businessName: redactSensitiveText(context.settings.business_name),
          available: selectedProduct.stock_quantity > 0
        })
      : { instructions: toolInstructions(input.toolId), input: inputText }) : null,
    output,
    configured,
    model: aiModel(),
    reviewRequired: true,
    usage
  };
}

export function aiBusinessStatus(planId: PlanId) {
  return {
    enabled: aiEnabled(),
    hasApiKey: false,
    provider: "browser",
    model: aiModel(),
    tools: AI_BUSINESS_TOOLS.map((tool) => ({
      ...tool,
      locked: planRank(planId) < planRank(tool.requiredPlan)
    }))
  };
}
