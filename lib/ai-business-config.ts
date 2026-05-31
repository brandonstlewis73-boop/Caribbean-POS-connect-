import type { PlanId } from "./plan-gating";

export type AiBusinessToolId =
  | "whatsapp_ordering_assistant"
  | "missed_call_responder"
  | "product_description_writer"
  | "promo_generator"
  | "slow_day_sales_booster"
  | "customer_loyalty_engine"
  | "inventory_forecast"
  | "prep_list"
  | "delivery_dispatcher"
  | "order_delay_detector"
  | "business_coach"
  | "profit_advisor"
  | "review_reply_generator"
  | "onboarding_wizard"
  | "saas_support_agent"
  | "receipt_scanner"
  | "expense_tracker"
  | "caribbean_business_mode"
  | "smart_upsell_checkout";

export type AiBusinessToolCategory =
  | "Orders"
  | "Marketing"
  | "Customers"
  | "Inventory"
  | "Delivery"
  | "Finance"
  | "Operations"
  | "Support";

export type AiBusinessToolConfig = {
  id: AiBusinessToolId;
  title: string;
  shortTitle: string;
  category: AiBusinessToolCategory;
  description: string;
  promptLabel: string;
  placeholder: string;
  requiredPlan: PlanId;
};

export const AI_BUSINESS_TOOLS: AiBusinessToolConfig[] = [
  {
    id: "whatsapp_ordering_assistant",
    title: "AI WhatsApp Ordering Assistant",
    shortTitle: "WhatsApp Orders",
    category: "Orders",
    description: "Drafts order-taking replies for WhatsApp without sending them automatically.",
    promptLabel: "Customer message or order request",
    placeholder: "Paste the customer's WhatsApp message or describe what they want to order.",
    requiredPlan: "pro"
  },
  {
    id: "missed_call_responder",
    title: "AI Missed-Call Responder",
    shortTitle: "Missed Calls",
    category: "Support",
    description: "Creates a polite callback or WhatsApp response for missed calls.",
    promptLabel: "Call context",
    placeholder: "Example: Missed call from a customer asking about delivery to Chaguanas.",
    requiredPlan: "pro"
  },
  {
    id: "product_description_writer",
    title: "AI Product Description Writer",
    shortTitle: "Descriptions",
    category: "Marketing",
    description: "Writes clean product descriptions using your real products and brand tone.",
    promptLabel: "Product or service details",
    placeholder: "Select or describe the item, ingredients, service details, size, and price.",
    requiredPlan: "pro"
  },
  {
    id: "promo_generator",
    title: "AI Promo Generator",
    shortTitle: "Promos",
    category: "Marketing",
    description: "Drafts promotions for WhatsApp, Instagram, storefront banners, and flyers.",
    promptLabel: "Promo goal",
    placeholder: "Example: Move more lunch orders today without discounting too much.",
    requiredPlan: "pro"
  },
  {
    id: "slow_day_sales_booster",
    title: "AI Slow-Day Sales Booster",
    shortTitle: "Slow Day Boost",
    category: "Marketing",
    description: "Suggests practical offers and outreach when sales are quiet.",
    promptLabel: "What is slow today?",
    placeholder: "Example: Tuesday afternoon is slow. We have chicken, fries, and drinks in stock.",
    requiredPlan: "premium"
  },
  {
    id: "customer_loyalty_engine",
    title: "AI Customer Loyalty Engine",
    shortTitle: "Loyalty",
    category: "Customers",
    description: "Finds retention and loyalty ideas from your customer/order patterns.",
    promptLabel: "Loyalty goal",
    placeholder: "Example: Bring back customers who have not ordered in a while.",
    requiredPlan: "premium"
  },
  {
    id: "inventory_forecast",
    title: "AI Inventory Forecast",
    shortTitle: "Forecast",
    category: "Inventory",
    description: "Estimates what may run low using sales, stock, and low-stock alerts.",
    promptLabel: "Forecast window",
    placeholder: "Example: Forecast what to prep and restock for this weekend.",
    requiredPlan: "premium"
  },
  {
    id: "prep_list",
    title: "AI Prep List",
    shortTitle: "Prep List",
    category: "Operations",
    description: "Turns active orders and inventory into a kitchen or shop prep checklist.",
    promptLabel: "Prep context",
    placeholder: "Example: Build a prep list for today's accepted and preparing orders.",
    requiredPlan: "pro"
  },
  {
    id: "delivery_dispatcher",
    title: "AI Delivery Dispatcher",
    shortTitle: "Dispatcher",
    category: "Delivery",
    description: "Suggests delivery sequence, driver notes, and map-link checks.",
    promptLabel: "Dispatcher notes",
    placeholder: "Example: Prioritize hot food and closest addresses first.",
    requiredPlan: "premium"
  },
  {
    id: "order_delay_detector",
    title: "AI Order Delay Detector",
    shortTitle: "Delay Detector",
    category: "Orders",
    description: "Flags orders that may need attention before customers get upset.",
    promptLabel: "Delay rules",
    placeholder: "Example: Warn me if new orders are older than 15 minutes.",
    requiredPlan: "premium"
  },
  {
    id: "business_coach",
    title: "AI Business Coach",
    shortTitle: "Coach",
    category: "Operations",
    description: "Gives simple operating advice for Caribbean small businesses.",
    promptLabel: "Business question",
    placeholder: "Example: How can I organize my staff and daily closeout better?",
    requiredPlan: "pro"
  },
  {
    id: "profit_advisor",
    title: "AI Profit Advisor",
    shortTitle: "Profit",
    category: "Finance",
    description: "Reviews prices, costs, discounts, and margin pressure from real data.",
    promptLabel: "Profit question",
    placeholder: "Example: Which items might need a price increase?",
    requiredPlan: "premium"
  },
  {
    id: "review_reply_generator",
    title: "AI Review Reply Generator",
    shortTitle: "Reviews",
    category: "Marketing",
    description: "Drafts professional replies to customer reviews.",
    promptLabel: "Customer review",
    placeholder: "Paste the customer review and the tone you want.",
    requiredPlan: "pro"
  },
  {
    id: "onboarding_wizard",
    title: "AI Onboarding Wizard",
    shortTitle: "Onboarding",
    category: "Operations",
    description: "Creates a setup plan for products, staff, delivery, receipts, and WhatsApp.",
    promptLabel: "Business setup goal",
    placeholder: "Example: I run a salon and need to set up services, staff, and receipts.",
    requiredPlan: "pro"
  },
  {
    id: "saas_support_agent",
    title: "AI SaaS Support Agent",
    shortTitle: "SaaS Support",
    category: "Support",
    description: "Answers app setup questions using safe support rules.",
    promptLabel: "Support question",
    placeholder: "Example: Why are WhatsApp test messages not sending?",
    requiredPlan: "pro"
  },
  {
    id: "receipt_scanner",
    title: "AI Receipt Scanner",
    shortTitle: "Receipt Scan",
    category: "Finance",
    description: "Extracts expense details from pasted receipt text for review.",
    promptLabel: "Receipt text",
    placeholder: "Paste receipt text, vendor, total, tax, and notes. Image OCR can be added when storage is connected.",
    requiredPlan: "premium"
  },
  {
    id: "expense_tracker",
    title: "AI Expense Tracker",
    shortTitle: "Expenses",
    category: "Finance",
    description: "Classifies expenses and suggests what to track for profit reports.",
    promptLabel: "Expense details",
    placeholder: "Example: Paid TTD 350 for chicken, oil, and containers.",
    requiredPlan: "premium"
  },
  {
    id: "caribbean_business_mode",
    title: "Caribbean Business Mode",
    shortTitle: "Caribbean Mode",
    category: "Operations",
    description: "Adapts wording, currencies, delivery realities, and customer tone for Caribbean businesses.",
    promptLabel: "What should sound more local?",
    placeholder: "Example: Make this promo sound professional for Trinidad customers.",
    requiredPlan: "pro"
  },
  {
    id: "smart_upsell_checkout",
    title: "AI Smart Upsell Checkout",
    shortTitle: "Smart Upsell",
    category: "Orders",
    description: "Suggests add-ons and bundles at checkout for staff to review.",
    promptLabel: "Cart or checkout context",
    placeholder: "Example: Customer ordered jerk chicken and sorrel. Suggest a useful add-on.",
    requiredPlan: "premium"
  }
];

export function getAiBusinessTool(id: string) {
  return AI_BUSINESS_TOOLS.find((tool) => tool.id === id);
}
