import type { AiBusinessToolId } from "./ai-business-config";
import { getWorkflowGuide } from "./ai-workflows";

const names: Record<AiBusinessToolId, string> = {
  whatsapp_ordering_assistant: "WhatsApp orders", missed_call_responder: "Missed calls",
  product_description_writer: "Product descriptions", promo_generator: "Promotions",
  slow_day_sales_booster: "Sales opportunities", customer_loyalty_engine: "Customer loyalty",
  inventory_forecast: "Inventory planning", prep_list: "Prep checklist",
  delivery_dispatcher: "Delivery planning", order_delay_detector: "Order delays",
  business_coach: "Business priorities", profit_advisor: "Profit insights",
  review_reply_generator: "Review replies", onboarding_wizard: "Business setup",
  saas_support_agent: "Help & troubleshooting", receipt_scanner: "Receipt details",
  expense_tracker: "Expense classification", caribbean_business_mode: "Brand voice",
  smart_upsell_checkout: "Checkout suggestions"
};
export function workflowName(id: AiBusinessToolId) { return names[id]; }
export function usesProductSelection(id: AiBusinessToolId) {
  return id === "product_description_writer" || id === "promo_generator";
}
export function canOpenWhatsApp(id: AiBusinessToolId) {
  return ["whatsapp_ordering_assistant", "missed_call_responder", "promo_generator", "review_reply_generator", "caribbean_business_mode"].includes(id);
}
export function workflowStarters(id: AiBusinessToolId) {
  if (id === "product_description_writer") return [
    { label: "Write a description for my selected product", prompt: "Write a concise storefront description for the selected product. Use its verified facts only. Do not invent ingredients, materials, health benefits, or guarantees." },
    { label: "Improve the existing description", prompt: "Improve the selected product's existing description. Preserve all verified facts and make it easier to read. If no description exists, write one using only the provided product facts." },
    { label: "Create a shorter version", prompt: "Write a one-sentence description for the selected product, using only verified facts." }
  ];
  const guide = getWorkflowGuide(id);
  return [
    { label: `Start with ${workflowName(id).toLowerCase()}`, prompt: guide.goal },
    { label: "Focus on today's priorities", prompt: `${guide.goal} Focus on the most useful next step for today. State anything that needs checking.` },
    { label: "Create a concise checklist", prompt: `${guide.goal} Use a short checklist where appropriate. Preserve all verified facts.` }
  ];
}
export function friendlyAiProgress(text: string) {
  const percent = text.match(/(\d+(?:\.\d+)?)%/);
  if (/fetch|download|cache|loading model/i.test(text)) return percent ? `Preparing AI on this device · ${Math.round(Number(percent[1]))}%` : "Preparing AI on this device…";
  if (/writing|draft.*checking/i.test(text)) return "Working on your request…";
  if (/correction|first draft/i.test(text)) return "Refining the response…";
  return /GPU|starting|local AI files/i.test(text) ? "Starting your assistant…" : text;
}
