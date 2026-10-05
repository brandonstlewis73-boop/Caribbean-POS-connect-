import { getAiBusinessTool, type AiBusinessToolId, type AiBusinessToolCategory } from "./ai-business-config";

const workspaces: Record<AiBusinessToolCategory, { href: string; label: string }> = {
  Orders: { href: "/orders", label: "Open orders" },
  Marketing: { href: "/products", label: "Open products" },
  Customers: { href: "/customers", label: "Open customers" },
  Inventory: { href: "/inventory", label: "Open inventory" },
  Delivery: { href: "/deliveries", label: "Open deliveries" },
  Finance: { href: "/reports", label: "Open reports" },
  Operations: { href: "/dashboard", label: "Open dashboard" },
  Support: { href: "/help", label: "Open help" }
};

const goals: Record<AiBusinessToolId, string> = {
  whatsapp_ordering_assistant: "Reply to a customer asking what is available for pickup. Include products and prices, then ask which items they want.",
  missed_call_responder: "Draft a short WhatsApp reply to a missed customer call asking how we can help. Do not promise a callback time.",
  product_description_writer: "Write a short storefront description for one available product. Use saved facts only and placeholders for missing details.",
  promo_generator: "Write a short WhatsApp promotion for an available product. Use saved prices or [PRICE] when a price is missing. Do not invent discounts or opening hours.",
  slow_day_sales_booster: "Suggest three ways to increase today's sales using available stock. Label new offers as suggestions and explain any assumptions.",
  customer_loyalty_engine: "Suggest a simple loyalty campaign from saved customer and order patterns. Do not invent customer activity or claim messages were sent.",
  inventory_forecast: "Review stock and recent orders. List items needing attention and a suggested restock checklist. Explain missing data and forecast assumptions.",
  prep_list: "Build a short prep checklist from accepted and preparing orders. Include order numbers, products, and quantities available in the records.",
  delivery_dispatcher: "Review active delivery orders and suggest a dispatch checklist. Do not invent travel times, addresses, or driver assignments.",
  order_delay_detector: "Review active orders for possible delays. List order numbers and timestamps that need checking; do not invent promised completion times.",
  business_coach: "Use current business performance to suggest three practical priorities for today. Separate recorded facts from recommendations.",
  profit_advisor: "Review saved selling prices and costs. Identify possible margin pressure and explain suggested changes as estimates.",
  review_reply_generator: "Draft a polite reply to this review: The staff were friendly, but my order took longer than expected. Do not invent a refund or promise compensation.",
  onboarding_wizard: "Build a setup checklist for products, staff, receipts, pickup, delivery, and WhatsApp. Mark details that still need checking.",
  saas_support_agent: "Help me check why WhatsApp notifications are not arriving. Give a short troubleshooting checklist without claiming access to provider delivery logs.",
  receipt_scanner: "Extract vendor, date, subtotal, tax, and total from receipt text I provide. Leave missing fields as unknown. Do not create an accounting record.",
  expense_tracker: "Help classify a supplier expense I describe. Ask for missing amount or date and return a draft entry for review.",
  caribbean_business_mode: "Rewrite the message I provide in a friendly, professional Caribbean business tone. Preserve all facts and currency.",
  smart_upsell_checkout: "Suggest an available add-on for the cart I describe. Use saved prices and stock; do not add it to an order automatically."
};

export function getWorkflowGuide(id: AiBusinessToolId) {
  const tool = getAiBusinessTool(id)!;
  return { goal: goals[id], workspace: workspaces[tool.category] };
}

export function workflowRevisionPrompt(goal: string, draft: string, change: string) {
  return `Revise this draft. Preserve verified facts and follow the requested changes.\nOriginal goal: ${goal.slice(0, 300)}\nDraft to revise:\n${draft.slice(0, 850)}\nRequested changes:\n${change.slice(0, 500)}`;
}

export function workflowRecordContext(category: AiBusinessToolCategory, records: { products: string; orders: string; customers: string }) {
  const priorities: Record<AiBusinessToolCategory, (keyof typeof records)[]> = {
    Orders: ["orders", "products"], Marketing: ["products", "orders"],
    Customers: ["customers", "orders"], Inventory: ["products", "orders"],
    Delivery: ["orders"], Finance: ["products", "orders"],
    Operations: ["orders", "products"], Support: []
  };
  return priorities[category].map((key, index) => `${key}:\n${records[key].slice(0, index === 0 ? 1500 : 800)}`).join("\n\n");
}
