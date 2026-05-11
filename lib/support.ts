import { createId, isDemoMode, query, transaction } from "./db";
import { DEFAULT_HELP_ARTICLES } from "./support-context";
import type {
  HelpArticle,
  HelpArticleInput,
  Role,
  SupportTicket,
  SupportTicketInput,
  SupportTicketPriority,
  SupportTicketStatus
} from "./types";

type TicketAiFields = {
  ai_summary?: string | null;
  ai_category?: string | null;
  ai_priority?: SupportTicketPriority | null;
  ai_possible_solution?: string | null;
  ai_steps_tried?: string[];
};

type SupportTicketUpdate = {
  status?: SupportTicketStatus;
  priority?: SupportTicketPriority;
  issue_category?: string;
  ai_summary?: string | null;
  ai_possible_solution?: string | null;
};

declare global {
  var __cpcDemoSupportTickets: SupportTicket[] | undefined;
  var __cpcDemoHelpArticles: HelpArticle[] | undefined;
}

function demoArticles() {
  if (!globalThis.__cpcDemoHelpArticles) {
    globalThis.__cpcDemoHelpArticles = DEFAULT_HELP_ARTICLES.map((article) => ({ ...article }));
  }
  return globalThis.__cpcDemoHelpArticles;
}

function demoTickets() {
  if (!globalThis.__cpcDemoSupportTickets) globalThis.__cpcDemoSupportTickets = [];
  return globalThis.__cpcDemoSupportTickets;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value as T;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function toDateString(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function bool(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return Boolean(value);
}

function rowToHelpArticle(row: any): HelpArticle {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    content: row.content,
    tags: parseJson<string[]>(row.tags, []),
    visibility: row.visibility || "staff",
    published: bool(row.published),
    last_updated_at: toDateString(row.last_updated_at || row.updated_at || row.created_at),
    created_by: row.created_by,
    updated_by: row.updated_by,
    created_at: toDateString(row.created_at),
    updated_at: toDateString(row.updated_at)
  };
}

function rowToSupportTicket(row: any): SupportTicket {
  return {
    id: row.id,
    ticket_number: row.ticket_number,
    name: row.name,
    business_name: row.business_name,
    email: row.email,
    phone: row.phone,
    issue_category: row.issue_category,
    priority: row.priority || "medium",
    status: row.status || "new",
    message: row.message,
    screenshot_url: row.screenshot_url,
    ai_summary: row.ai_summary,
    ai_category: row.ai_category,
    ai_priority: row.ai_priority,
    ai_possible_solution: row.ai_possible_solution,
    ai_steps_tried: parseJson<string[]>(row.ai_steps_tried, []),
    submitted_by: row.submitted_by,
    submitted_by_name: row.submitted_by_name,
    created_at: toDateString(row.created_at),
    updated_at: toDateString(row.updated_at)
  };
}

export function canManageSupport(role: Role) {
  return role === "owner" || role === "admin" || role === "manager";
}

function allowedVisibility(role?: Role | null) {
  if (!role) return ["public"];
  if (canManageSupport(role)) return ["admin", "staff", "public"];
  return ["staff", "public"];
}

function matchesArticleSearch(article: HelpArticle, search?: string | null) {
  const needle = search?.trim().toLowerCase();
  if (!needle) return true;
  return [article.title, article.category, article.content, ...article.tags]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export async function listHelpArticles({
  search,
  role,
  includeUnpublished = false
}: {
  search?: string | null;
  role?: Role | null;
  includeUnpublished?: boolean;
} = {}) {
  const visibility = allowedVisibility(role);
  if (isDemoMode) {
    return demoArticles()
      .filter((article) => visibility.includes(article.visibility))
      .filter((article) => includeUnpublished || article.published)
      .filter((article) => matchesArticleSearch(article, search))
      .sort((a, b) => `${a.category}-${a.title}`.localeCompare(`${b.category}-${b.title}`));
  }

  const params: unknown[] = [visibility];
  const clauses = ["visibility = ANY($1::text[])"];
  if (!includeUnpublished) clauses.push("published = TRUE");
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    clauses.push(`(title ILIKE $${params.length} OR category ILIKE $${params.length} OR content ILIKE $${params.length})`);
  }
  const rows = await query<any>(
    `SELECT *
     FROM help_articles
     WHERE ${clauses.join(" AND ")}
     ORDER BY category ASC, title ASC`,
    params
  );
  return rows.rows.map(rowToHelpArticle);
}

export async function createHelpArticle(input: HelpArticleInput, userId?: string | null) {
  const now = new Date().toISOString();
  if (isDemoMode) {
    const article: HelpArticle = {
      id: createId("help"),
      title: input.title || "Untitled article",
      category: input.category || "Getting Started",
      content: input.content || "",
      tags: input.tags || [],
      visibility: input.visibility || "staff",
      published: input.published ?? true,
      last_updated_at: now,
      created_by: userId || null,
      updated_by: userId || null,
      created_at: now,
      updated_at: now
    };
    demoArticles().unshift(article);
    return article;
  }

  const id = createId("help");
  await query(
    `INSERT INTO help_articles (
      id, title, category, content, tags, visibility, published, last_updated_at, created_by, updated_by
    ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, NOW(), $8, $8)`,
    [
      id,
      input.title,
      input.category,
      input.content,
      JSON.stringify(input.tags || []),
      input.visibility || "staff",
      input.published ?? true,
      userId || null
    ]
  );
  return getHelpArticle(id);
}

export async function getHelpArticle(id: string) {
  if (isDemoMode) return demoArticles().find((article) => article.id === id) || null;
  const rows = await query<any>("SELECT * FROM help_articles WHERE id = $1", [id]);
  return rows.rows[0] ? rowToHelpArticle(rows.rows[0]) : null;
}

export async function updateHelpArticle(id: string, input: HelpArticleInput, userId?: string | null) {
  if (isDemoMode) {
    const article = demoArticles().find((item) => item.id === id);
    if (!article) return null;
    Object.assign(article, {
      ...input,
      tags: input.tags ?? article.tags,
      updated_by: userId || article.updated_by,
      updated_at: new Date().toISOString(),
      last_updated_at: new Date().toISOString()
    });
    return article;
  }
  const existing = await getHelpArticle(id);
  if (!existing) return null;
  const next = { ...existing, ...input };
  await query(
    `UPDATE help_articles SET
      title = $1,
      category = $2,
      content = $3,
      tags = $4::jsonb,
      visibility = $5,
      published = $6,
      updated_by = $7,
      updated_at = NOW(),
      last_updated_at = NOW()
     WHERE id = $8`,
    [
      next.title,
      next.category,
      next.content,
      JSON.stringify(next.tags || []),
      next.visibility,
      next.published,
      userId || null,
      id
    ]
  );
  return getHelpArticle(id);
}

export async function deleteHelpArticle(id: string) {
  if (isDemoMode) {
    const index = demoArticles().findIndex((article) => article.id === id);
    if (index < 0) return null;
    return demoArticles().splice(index, 1)[0];
  }
  return transaction(async (client) => {
    const existing = await client.query("SELECT * FROM help_articles WHERE id = $1", [id]);
    if (!existing.rows[0]) return null;
    await client.query("DELETE FROM help_articles WHERE id = $1", [id]);
    return rowToHelpArticle(existing.rows[0]);
  });
}

function ticketNumber() {
  return `SUP-${Date.now().toString().slice(-8)}`;
}

export async function createSupportTicket(
  input: SupportTicketInput,
  userId?: string | null,
  aiFields: TicketAiFields = {}
) {
  const now = new Date().toISOString();
  if (isDemoMode) {
    const ticket: SupportTicket = {
      id: createId("tic"),
      ticket_number: ticketNumber(),
      name: input.name || "Support user",
      business_name: input.business_name || null,
      email: input.email || "support@example.com",
      phone: input.phone || null,
      issue_category: aiFields.ai_category || input.issue_category || "Troubleshooting",
      priority: aiFields.ai_priority || input.priority || "medium",
      status: "new",
      message: input.message || "",
      screenshot_url: input.screenshot_url || null,
      ai_summary: aiFields.ai_summary || null,
      ai_category: aiFields.ai_category || null,
      ai_priority: aiFields.ai_priority || null,
      ai_possible_solution: aiFields.ai_possible_solution || null,
      ai_steps_tried: aiFields.ai_steps_tried || [],
      submitted_by: userId || null,
      created_at: now,
      updated_at: now
    };
    demoTickets().unshift(ticket);
    return ticket;
  }

  const id = createId("tic");
  await query(
    `INSERT INTO support_tickets (
      id, ticket_number, name, business_name, email, phone, issue_category, priority,
      status, message, screenshot_url, ai_summary, ai_category, ai_priority,
      ai_possible_solution, ai_steps_tried, submitted_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9, $10, $11, $12, $13, $14, $15::jsonb, $16)`,
    [
      id,
      ticketNumber(),
      input.name,
      input.business_name || null,
      input.email,
      input.phone || null,
      aiFields.ai_category || input.issue_category || "Troubleshooting",
      aiFields.ai_priority || input.priority || "medium",
      input.message,
      input.screenshot_url || null,
      aiFields.ai_summary || null,
      aiFields.ai_category || null,
      aiFields.ai_priority || null,
      aiFields.ai_possible_solution || null,
      JSON.stringify(aiFields.ai_steps_tried || []),
      userId || null
    ]
  );
  return getSupportTicket(id);
}

export async function listSupportTickets({
  role,
  userId,
  search
}: {
  role?: Role | null;
  userId?: string | null;
  search?: string | null;
} = {}) {
  if (isDemoMode) {
    const canManage = role ? canManageSupport(role) : false;
    const needle = search?.trim().toLowerCase();
    return demoTickets()
      .filter((ticket) => canManage || ticket.submitted_by === userId)
      .filter((ticket) =>
        !needle
          ? true
          : [ticket.ticket_number, ticket.name, ticket.email, ticket.issue_category, ticket.message]
              .join(" ")
              .toLowerCase()
              .includes(needle)
      );
  }
  const params: unknown[] = [];
  const clauses: string[] = [];
  if (!role || !canManageSupport(role)) {
    params.push(userId || "");
    clauses.push(`submitted_by = $${params.length}`);
  }
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    clauses.push(`(ticket_number ILIKE $${params.length} OR name ILIKE $${params.length} OR email ILIKE $${params.length} OR issue_category ILIKE $${params.length} OR message ILIKE $${params.length})`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = await query<any>(
    `SELECT t.*, u.name AS submitted_by_name
     FROM support_tickets t
     LEFT JOIN users u ON u.id = t.submitted_by
     ${where}
     ORDER BY t.created_at DESC
     LIMIT 150`,
    params
  );
  return rows.rows.map(rowToSupportTicket);
}

export async function getSupportTicket(id: string) {
  if (isDemoMode) return demoTickets().find((ticket) => ticket.id === id) || null;
  const rows = await query<any>(
    `SELECT t.*, u.name AS submitted_by_name
     FROM support_tickets t
     LEFT JOIN users u ON u.id = t.submitted_by
     WHERE t.id = $1`,
    [id]
  );
  return rows.rows[0] ? rowToSupportTicket(rows.rows[0]) : null;
}

export async function updateSupportTicket(id: string, input: SupportTicketUpdate) {
  if (isDemoMode) {
    const ticket = demoTickets().find((item) => item.id === id);
    if (!ticket) return null;
    Object.assign(ticket, { ...input, updated_at: new Date().toISOString() });
    return ticket;
  }
  const existing = await getSupportTicket(id);
  if (!existing) return null;
  const next = { ...existing, ...input };
  await query(
    `UPDATE support_tickets SET
      status = $1,
      priority = $2,
      issue_category = $3,
      ai_summary = $4,
      ai_possible_solution = $5,
      updated_at = NOW()
     WHERE id = $6`,
    [
      next.status,
      next.priority,
      next.issue_category,
      next.ai_summary || null,
      next.ai_possible_solution || null,
      id
    ]
  );
  return getSupportTicket(id);
}

export async function createAiSupportLog({
  userId,
  businessId,
  question,
  responseSummary,
  ticketId
}: {
  userId?: string | null;
  businessId?: string | null;
  question: string;
  responseSummary?: string | null;
  ticketId?: string | null;
}) {
  if (isDemoMode) return null;
  await query(
    `INSERT INTO ai_support_logs (id, user_id, business_id, question, response_summary, ticket_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [createId("ailog"), userId || null, businessId || null, question, responseSummary || null, ticketId || null]
  );
  return true;
}
