import { LOCAL_AI_MODEL, localAiEnabled } from "./local-ai-config";
import { HELP_CATEGORIES, SUPPORT_KNOWLEDGE_CONTEXT } from "./support-context";
import type { HelpArticle, Role, SupportTicketInput, SupportTicketPriority } from "./types";

type SupportChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type SupportAnswerInput = {
  question: string;
  role: Role;
  currentPage?: string | null;
  articles: HelpArticle[];
  messages?: SupportChatMessage[];
};

export type TicketSummary = {
  ai_summary: string;
  ai_category: string;
  ai_priority: SupportTicketPriority;
  ai_possible_solution: string;
  ai_steps_tried: string[];
};

const SECRET_PATTERNS = [
  /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
  /\bsk-[A-Za-z0-9_-]{12,}\b/g,
  /\bBearer\s+[A-Za-z0-9._-]+/gi,
  /\b(?:DATABASE_URL|SUPABASE_DB_URL|OPENAI_API_KEY|TWILIO_ACCOUNT_SID|TWILIO_AUTH_TOKEN|TWILIO_PHONE_NUMBER|TWILIO_WHATSAPP_FROM|SESSION_SECRET)\s*=\s*[^\s]+/gi,
  /\b(password|auth_token|api_key|secret)\s*[:=]\s*[^\s"'<>]+/gi
];

export function aiSupportStatus() {
  const enabled = localAiEnabled();
  return { enabled, hasApiKey: false, provider: "browser", model: LOCAL_AI_MODEL,
    message: enabled ? "Local browser AI is available on compatible devices." : "AI support is disabled." };
}

export function redactSensitiveText(value: string) {
  return SECRET_PATTERNS.reduce(
    (text, pattern) => text.replace(pattern, "[redacted]"),
    String(value || "")
  ).slice(0, 6000);
}

function looksLikeSecretRequest(question: string) {
  const normalized = question.toLowerCase();
  return (
    normalized.includes("show me") &&
      (normalized.includes("api key") ||
        normalized.includes("database_url") ||
        normalized.includes("database url") ||
        normalized.includes("password") ||
        normalized.includes("secret")) ||
    normalized.includes("reveal environment") ||
    normalized.includes("print env")
  );
}

function articleContext(articles: HelpArticle[]) {
  return articles
    .slice(0, 14)
    .map((article) => `Title: ${article.title}\nCategory: ${article.category}\nVisibility: ${article.visibility}\nContent: ${article.content}`)
    .join("\n\n");
}

function supportInstructions(role: Role, currentPage?: string | null) {
  return `
You are the Caribbean POS Connect support assistant.
Answer in short, friendly, professional steps.
Use Caribbean POS Connect terms and the supplied help articles.
Current user role: ${role}.
Current page: ${currentPage || "Unknown"}.

Role rules:
- Admin, owner, and manager users may get help with settings, subscriptions, staff, reports, database health, Vercel/Supabase setup, and WhatsApp setup.
- Staff users may get help with checkout, products, customers, orders, delivery, receipts, and everyday troubleshooting.
- Drivers may get help with assigned delivery orders, Waze, and delivery status.
- Do not reveal private customer/order data. You are not given private records, so do not invent them.

Safety rules:
- Never reveal secrets, environment variable values, API keys, database passwords, session tokens, or full database URLs.
- Do not execute commands, change database settings, delete data, or bypass role permissions.
- If a request needs a human, ask the user to create a support ticket.
- If unsure, ask one clarifying question.

${SUPPORT_KNOWLEDGE_CONTEXT}
`;
}

function fallbackAnswer(question: string, articles: HelpArticle[]) {
  if (looksLikeSecretRequest(question)) {
    return "I can't reveal secret keys, database passwords, API tokens, or environment variable values. I can still help you check whether they are configured using the Health page or safe Vercel/Supabase diagnostics.";
  }
  const normalized = question.toLowerCase();
  const match =
    articles.find((article) =>
      [article.title, article.category, article.content, ...article.tags]
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    ) ||
    articles.find((article) =>
      normalized
        .split(/\s+/)
        .filter((word) => word.length > 3)
        .some((word) => [article.title, article.category, article.content, ...article.tags].join(" ").toLowerCase().includes(word))
    );

  if (match) {
    return `${match.title}\n\n${match.content}\n\nNeed more help? Submit a support ticket with what you tried and what happened.`;
  }

  return "AI support is not configured yet. You can still search the help articles, use the getting started checklist, or submit a support ticket with the issue category, priority, and steps you already tried.";
}

export async function generateSupportAnswer({ question, role, currentPage, articles, messages = [] }: SupportAnswerInput) {
  const cleanQuestion = redactSensitiveText(question);
  const status = aiSupportStatus();
  if (!status.enabled) {
    return {
      configured: false,
      answer: fallbackAnswer(cleanQuestion, articles),
      model: status.model
    };
  }

  if (looksLikeSecretRequest(cleanQuestion)) {
    return {
      configured: true,
      answer: fallbackAnswer(cleanQuestion, articles),
      model: status.model
    };
  }

  const recentMessages = messages
    .slice(-8)
    .map((message) => `${message.role}: ${redactSensitiveText(message.content)}`)
    .join("\n");

  return {
    configured: false,
    answer: "Local AI context prepared.",
    generation: { instructions: supportInstructions(role, currentPage), input: `User question:\n${cleanQuestion.slice(0, 1500)}\n\nRecent chat:\n${recentMessages.slice(-1200)}\n\nHelp articles:\n${redactSensitiveText(articleContext(articles)).slice(0, 3000)}` },
    model: status.model
  };
}

function heuristicCategory(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("login") || normalized.includes("password") || normalized.includes("database") || normalized.includes("supabase")) return "Troubleshooting";
  if (normalized.includes("barcode") || normalized.includes("inventory") || normalized.includes("product")) return "Products & Inventory";
  if (normalized.includes("whatsapp")) return "WhatsApp Messaging";
  if (normalized.includes("receipt") || normalized.includes("print")) return "Receipts";
  if (normalized.includes("delivery") || normalized.includes("driver") || normalized.includes("waze")) return "Delivery";
  if (normalized.includes("subscription") || normalized.includes("billing")) return "Subscriptions";
  return "Troubleshooting";
}

function heuristicPriority(message: string, selected?: string | null): SupportTicketPriority {
  if (selected === "urgent" || selected === "high" || selected === "medium" || selected === "low") return selected;
  const normalized = message.toLowerCase();
  if (normalized.includes("down") || normalized.includes("cannot login") || normalized.includes("orders not saving")) return "urgent";
  if (normalized.includes("not saving") || normalized.includes("payment") || normalized.includes("database")) return "high";
  if (normalized.includes("slow") || normalized.includes("confusing")) return "medium";
  return "low";
}

function fallbackTicketSummary(ticket: SupportTicketInput): TicketSummary {
  const message = redactSensitiveText(ticket.message || "");
  const category = heuristicCategory(`${ticket.issue_category || ""} ${message}`);
  const priority = heuristicPriority(message, ticket.priority);
  return {
    ai_summary: message.slice(0, 220) || "Support request needs review.",
    ai_category: HELP_CATEGORIES.includes(category as any) ? category : "Troubleshooting",
    ai_priority: priority,
    ai_possible_solution:
      "Review the related Help & Support article, confirm the user's role and page, then ask for exact error text or a screenshot if the issue cannot be reproduced.",
    ai_steps_tried: message.toLowerCase().includes("tried") ? [message.slice(0, 180)] : []
  };
}

export async function generateTicketSummary(ticket: SupportTicketInput): Promise<TicketSummary> {
  // Ticket metadata remains deterministic on the server; no remote AI requests.
  return fallbackTicketSummary(ticket);
}
