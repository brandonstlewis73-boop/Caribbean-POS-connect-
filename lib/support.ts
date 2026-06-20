import { createId, query, transaction } from "./db";
import { getBusinessIdForUser } from "./data";
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
    business_id: row.business_id || null,
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
  const rows = await query<any>("SELECT * FROM help_articles WHERE id = $1", [id]);
  return rows.rows[0] ? rowToHelpArticle(rows.rows[0]) : null;
}

export async function updateHelpArticle(id: string, input: HelpArticleInput, userId?: string | null) {
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
  businessId?: string | null,
  aiFields: TicketAiFields = {}
) {
  const id = createId("tic");
  const resolvedBusinessId = businessId || (await getBusinessIdForUser(userId));
  await query(
    `INSERT INTO support_tickets (
      id, ticket_number, name, business_name, email, phone, issue_category, priority,
      status, message, screenshot_url, ai_summary, ai_category, ai_priority,
      ai_possible_solution, ai_steps_tried, submitted_by, business_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', $9, $10, $11, $12, $13, $14, $15::jsonb, $16, $17)`,
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
      userId || null,
      resolvedBusinessId || null
    ]
  );
  return getSupportTicket(id, resolvedBusinessId);
}

export async function listSupportTickets({
  role,
  userId,
  businessId,
  search
}: {
  role?: Role | null;
  userId?: string | null;
  businessId?: string | null;
  search?: string | null;
} = {}) {
  const params: unknown[] = [];
  const clauses: string[] = [];
  const resolvedBusinessId = businessId || (await getBusinessIdForUser(userId));
  if (resolvedBusinessId) {
    params.push(resolvedBusinessId);
    const businessParam = `$${params.length}`;
    if (userId) {
      params.push(userId);
      clauses.push(`t.business_id = ${businessParam} AND t.submitted_by = $${params.length}`);
    } else {
      clauses.push(`t.business_id = ${businessParam}`);
    }
  }
  if (!role || !canManageSupport(role)) {
    params.push(userId || "");
    clauses.push(`t.submitted_by = $${params.length}`);
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

export async function getSupportTicket(id: string, businessId?: string | null) {
  const params: unknown[] = [id];
  const businessClause = businessId
    ? `AND t.business_id = $2`
    : "";
  if (businessId) params.push(businessId);
  const rows = await query<any>(
    `SELECT t.*, u.name AS submitted_by_name
     FROM support_tickets t
     LEFT JOIN users u ON u.id = t.submitted_by
     WHERE t.id = $1 ${businessClause}`,
    params
  );
  return rows.rows[0] ? rowToSupportTicket(rows.rows[0]) : null;
}

export async function updateSupportTicket(id: string, input: SupportTicketUpdate, businessId?: string | null) {
  const existing = await getSupportTicket(id, businessId);
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
     WHERE id = $6 ${businessId ? "AND business_id = $7" : ""}`,
    [
      next.status,
      next.priority,
      next.issue_category,
      next.ai_summary || null,
      next.ai_possible_solution || null,
      id,
      ...(businessId ? [businessId] : [])
    ]
  );
  return getSupportTicket(id, businessId);
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
  await query(
    `INSERT INTO ai_support_logs (id, user_id, business_id, question, response_summary, ticket_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [createId("ailog"), userId || null, businessId || null, question, responseSummary || null, ticketId || null]
  );
  return true;
}
