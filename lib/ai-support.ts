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

function aiEnabledByFlag() {
  const flag = process.env.AI_SUPPORT_ENABLED;
  return flag === undefined || flag === "" || flag === "true" || flag === "1";
}

export function aiSupportStatus() {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY);
  const enabled = aiEnabledByFlag() && hasApiKey;
  return {
    enabled,
    hasApiKey,
    model: process.env.AI_MODEL || "gpt-5",
    message: enabled
      ? "AI support is ready."
      : "AI support is not configured yet."
  };
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
You are the Caribbean Connect POS support assistant.
Answer in short, friendly, professional steps.
Use Caribbean Connect POS terms and the supplied help articles.
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

async function callOpenAi({
  instructions,
  input,
  maxOutputTokens = 700
}: {
  instructions: string;
  input: string;
  maxOutputTokens?: number;
}) {
  const status = aiSupportStatus();
  if (!status.enabled) return null;

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: status.model,
      instructions,
      input,
      max_output_tokens: maxOutputTokens
    })
  });

  if (!response.ok) {
    console.warn("AI support request failed", { status: response.status });
    return null;
  }

  const payload = await response.json();
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  return output
    .flatMap((item: any) => (Array.isArray(item.content) ? item.content : []))
    .map((content: any) => content?.text)
    .filter(Boolean)
    .join("\n")
    .trim();
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

  const answer =
    (await callOpenAi({
      instructions: supportInstructions(role, currentPage),
      input: `Help articles:\n${articleContext(articles)}\n\nRecent chat:\n${recentMessages}\n\nUser question:\n${cleanQuestion}`
    })) || fallbackAnswer(cleanQuestion, articles);

  return {
    configured: true,
    answer: redactSensitiveText(answer),
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
  const fallback = fallbackTicketSummary(ticket);
  const status = aiSupportStatus();
  if (!status.enabled) return fallback;

  const input = redactSensitiveText(
    `Create a JSON support triage summary for this ticket.
Name: ${ticket.name || ""}
Business: ${ticket.business_name || ""}
Category: ${ticket.issue_category || ""}
Priority selected: ${ticket.priority || ""}
Message: ${ticket.message || ""}`
  );

  const response = await callOpenAi({
    instructions:
      "Return only JSON with keys ai_summary, ai_category, ai_priority, ai_possible_solution, ai_steps_tried. Do not include secrets. Keep the summary short.",
    input,
    maxOutputTokens: 500
  });
  if (!response) return fallback;

  try {
    const parsed = JSON.parse(response.replace(/^```json\s*/i, "").replace(/```$/i, ""));
    const priority = heuristicPriority(String(parsed.ai_summary || ""), parsed.ai_priority);
    return {
      ai_summary: redactSensitiveText(String(parsed.ai_summary || fallback.ai_summary)).slice(0, 500),
      ai_category: String(parsed.ai_category || fallback.ai_category),
      ai_priority: priority,
      ai_possible_solution: redactSensitiveText(String(parsed.ai_possible_solution || fallback.ai_possible_solution)).slice(0, 1000),
      ai_steps_tried: Array.isArray(parsed.ai_steps_tried)
        ? parsed.ai_steps_tried.map((step: unknown) => redactSensitiveText(String(step)).slice(0, 240)).slice(0, 6)
        : fallback.ai_steps_tried
    };
  } catch {
    return fallback;
  }
}
