"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileQuestion,
  LifeBuoy,
  MessageCircle,
  PlusCircle,
  Search,
  Send,
  Sparkles,
  Trash2,
  Wrench
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { FAQS, GETTING_STARTED_CHECKLIST, HELP_CATEGORIES, QUICK_HELP_PROMPTS } from "@/lib/support-context";
import type { HelpArticle, Settings, SupportTicket, SupportTicketPriority, SupportTicketStatus, User } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  configured?: boolean;
};

type ArticleDraft = {
  title: string;
  category: string;
  content: string;
  tagsText: string;
  visibility: "admin" | "staff" | "public";
  published: boolean;
};

type TicketDraft = {
  name: string;
  business_name: string;
  email: string;
  phone: string;
  issue_category: string;
  priority: SupportTicketPriority;
  message: string;
  screenshot_url: string;
};

const emptyArticleDraft: ArticleDraft = {
  title: "",
  category: "Getting Started",
  content: "",
  tagsText: "",
  visibility: "staff",
  published: true
};

const priorityTone: Record<SupportTicketPriority, "neutral" | "amber" | "coral" | "red"> = {
  low: "neutral",
  medium: "amber",
  high: "coral",
  urgent: "red"
};

const statusTone: Record<SupportTicketStatus, "neutral" | "green" | "amber" | "teal"> = {
  new: "teal",
  open: "amber",
  waiting_on_customer: "neutral",
  resolved: "green",
  closed: "neutral"
};

function labelize(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function articleDraftFrom(article: HelpArticle): ArticleDraft {
  return {
    title: article.title,
    category: article.category,
    content: article.content,
    tagsText: article.tags.join(", "),
    visibility: article.visibility,
    published: article.published
  };
}

function articleBody(draft: ArticleDraft) {
  return {
    title: draft.title,
    category: draft.category,
    content: draft.content,
    tags: draft.tagsText
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    visibility: draft.visibility,
    published: draft.published
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Screenshot could not be read."));
    reader.readAsDataURL(file);
  });
}

export function HelpSupportClient({
  articles: initialArticles,
  tickets: initialTickets,
  user,
  settings,
  canManage,
  aiStatus,
  systemStatus
}: {
  articles: HelpArticle[];
  tickets: SupportTicket[];
  user: User;
  settings: Settings;
  canManage: boolean;
  aiStatus: { enabled: boolean; message: string; model: string };
  systemStatus: { databaseConfigured: boolean; demoMode: boolean; vercelEnv: string | null; nodeEnv: string };
}) {
  const [articles, setArticles] = useState(initialArticles);
  const [tickets, setTickets] = useState(initialTickets);
  const [articleSearch, setArticleSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: aiStatus.enabled
        ? "Hi, I can help with Caribbean Connect POS. Pick a quick help button or ask a question."
        : "AI support is not configured yet. You can still search articles or submit a support ticket.",
      configured: aiStatus.enabled
    }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>({
    name: user.name,
    business_name: settings.business_name,
    email: user.email,
    phone: user.phone || settings.business_phone || "",
    issue_category: "Troubleshooting",
    priority: "medium",
    message: "",
    screenshot_url: ""
  });
  const [articleDraft, setArticleDraft] = useState<ArticleDraft>(emptyArticleDraft);
  const [editingArticleId, setEditingArticleId] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [articleMessage, setArticleMessage] = useState("");
  const [busy, setBusy] = useState("");

  const filteredArticles = useMemo(() => {
    const needle = articleSearch.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatch = selectedCategory === "All" || article.category === selectedCategory;
      const searchMatch =
        !needle ||
        [article.title, article.category, article.content, ...article.tags]
          .join(" ")
          .toLowerCase()
          .includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [articles, articleSearch, selectedCategory]);

  async function askSupport(question = chatInput) {
    const clean = question.trim();
    if (!clean || chatBusy) return;
    setChatBusy(true);
    setChatInput("");
    const nextMessages: ChatMessage[] = [...chatMessages, { role: "user", content: clean }];
    setChatMessages(nextMessages);
    try {
      const response = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: clean,
          currentPage: window.location.pathname,
          messages: nextMessages.slice(-8)
        })
      });
      const payload = await readApiPayload<{ answer: string; configured: boolean; model: string }>(response);
      if (!response.ok || !payload.data) {
        throw new Error(payload.error || "Support chat could not answer.");
      }
      const data = payload.data;
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: data.answer, configured: data.configured }
      ]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Support chat could not answer. Please submit a support ticket."
        }
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function submitTicket() {
    setTicketMessage("");
    setBusy("ticket");
    try {
      const response = await fetch("/api/help/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketDraft)
      });
      const payload = await readApiPayload<{ ticket: SupportTicket }>(response);
      if (!response.ok || !payload.data?.ticket) {
        throw new Error(payload.error || "Support ticket could not be created.");
      }
      setTickets((current) => [payload.data!.ticket, ...current]);
      setTicketDraft((current) => ({ ...current, message: "", screenshot_url: "" }));
      setTicketMessage(`Ticket ${payload.data.ticket.ticket_number} created.`);
    } catch (error) {
      setTicketMessage(error instanceof Error ? error.message : "Support ticket could not be created.");
    } finally {
      setBusy("");
    }
  }

  async function updateTicket(id: string, patch: Partial<SupportTicket>) {
    setBusy(id);
    try {
      const response = await fetch(`/api/help/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch)
      });
      const payload = await readApiPayload<{ ticket: SupportTicket }>(response);
      if (!response.ok || !payload.data?.ticket) throw new Error(payload.error || "Ticket update failed.");
      setTickets((current) => current.map((ticket) => (ticket.id === id ? payload.data!.ticket : ticket)));
    } finally {
      setBusy("");
    }
  }

  async function saveArticle() {
    setArticleMessage("");
    setBusy("article");
    try {
      const endpoint = editingArticleId ? `/api/help/articles/${editingArticleId}` : "/api/help/articles";
      const response = await fetch(endpoint, {
        method: editingArticleId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleBody(articleDraft))
      });
      const payload = await readApiPayload<{ article: HelpArticle }>(response);
      if (!response.ok || !payload.data?.article) throw new Error(payload.error || "Article could not be saved.");
      setArticles((current) =>
        editingArticleId
          ? current.map((article) => (article.id === editingArticleId ? payload.data!.article : article))
          : [payload.data!.article, ...current]
      );
      setArticleDraft(emptyArticleDraft);
      setEditingArticleId("");
      setArticleMessage("Help article saved.");
    } catch (error) {
      setArticleMessage(error instanceof Error ? error.message : "Article could not be saved.");
    } finally {
      setBusy("");
    }
  }

  async function deleteArticle(id: string) {
    if (!window.confirm("Delete this help article?")) return;
    setBusy(id);
    try {
      const response = await fetch(`/api/help/articles/${id}`, { method: "DELETE" });
      const payload = await readApiPayload<{ article: HelpArticle }>(response);
      if (!response.ok) throw new Error(payload.error || "Article could not be deleted.");
      setArticles((current) => current.filter((article) => article.id !== id));
    } finally {
      setBusy("");
    }
  }

  async function handleScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 650 * 1024) {
      setTicketMessage("Screenshot must be under 650 KB.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setTicketDraft((current) => ({ ...current, screenshot_url: dataUrl }));
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
      <div className="grid min-w-0 gap-4">
        <Panel>
          <PanelHeader
            title="AI Support Chat"
            description="Short, role-aware answers for Caribbean Connect POS"
            action={<Badge tone={aiStatus.enabled ? "green" : "amber"}>{aiStatus.enabled ? aiStatus.model : "Fallback"}</Badge>}
          />
          <div className="grid gap-4 p-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_HELP_PROMPTS.map((prompt) => (
                <Button key={prompt} size="sm" variant="secondary" onClick={() => askSupport(prompt)} disabled={chatBusy}>
                  <Sparkles className="h-4 w-4" />
                  {prompt}
                </Button>
              ))}
            </div>
            <div className="grid max-h-[440px] gap-3 overflow-y-auto rounded-card border border-white/10 bg-black/25 p-3">
              {chatMessages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={message.role === "user" ? "ml-auto max-w-[90%] rounded-card bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950" : "mr-auto max-w-[94%] rounded-card bg-white/[0.08] px-3 py-2 text-sm font-semibold text-teal-50"}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.role === "assistant" && message.configured === false ? (
                    <p className="mt-2 text-xs font-black text-amber-100">AI support is not configured yet.</p>
                  ) : null}
                </div>
              ))}
              {chatBusy ? <p className="text-sm font-bold text-cyan-100/70">Support assistant is thinking...</p> : null}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <input
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    askSupport();
                  }
                }}
                className="h-11 min-w-0 flex-1 rounded-card border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/15"
                placeholder="Ask for help with checkout, customers, WhatsApp, delivery, login..."
              />
              <Button onClick={() => askSupport()} disabled={chatBusy || !chatInput.trim()} variant="primary">
                <Send className="h-4 w-4" />
                Send
              </Button>
            </div>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Help Articles" description="Search the built-in knowledge base" action={<Badge tone="teal">{filteredArticles.length} articles</Badge>} />
          <div className="grid gap-3 p-4">
            <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_220px]">
              <label className="relative block min-w-0">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-cyan-100/55" />
                <input
                  value={articleSearch}
                  onChange={(event) => setArticleSearch(event.target.value)}
                  className="h-10 w-full min-w-0 rounded-card border border-white/10 bg-black/30 pl-9 pr-3 text-sm font-semibold text-white outline-none focus:border-cyan-300"
                  placeholder="Search articles, tags, or topics"
                />
              </label>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="h-10 rounded-card border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300"
              >
                <option>All</option>
                {HELP_CATEGORIES.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {filteredArticles.map((article) => (
                <article key={article.id} className="grid min-w-0 gap-3 rounded-card border border-white/10 bg-black/20 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-black leading-tight">{article.title}</p>
                      <p className="mt-1 text-xs font-bold text-cyan-100/60">{article.category}</p>
                    </div>
                    <Badge tone={article.visibility === "admin" ? "amber" : article.visibility === "public" ? "green" : "teal"}>
                      {article.visibility}
                    </Badge>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed text-teal-50/76">{article.content}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {article.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-cyan-100/75">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => { setEditingArticleId(article.id); setArticleDraft(articleDraftFrom(article)); }}>
                        Edit
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => deleteArticle(article.id)} disabled={busy === article.id}>
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 lg:grid-cols-2">
          <Panel>
            <PanelHeader title="Getting Started" description="First-time setup checklist" />
            <div className="grid gap-2 p-4">
              {GETTING_STARTED_CHECKLIST.map((item) => (
                <p key={item} className="flex min-w-0 items-center gap-2 rounded-card bg-white/[0.055] px-3 py-2 text-sm font-bold">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                  {item}
                </p>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Frequently Asked Questions" />
            <div className="grid gap-3 p-4">
              {FAQS.map((faq) => (
                <div key={faq.question} className="rounded-card border border-white/10 bg-black/20 p-3">
                  <p className="font-black leading-tight">{faq.question}</p>
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-teal-50/72">{faq.answer}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {canManage ? (
          <Panel>
            <PanelHeader title={editingArticleId ? "Edit Help Article" : "Create Help Article"} description="Admin knowledge base management" />
            <div className="grid gap-3 p-4">
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Title" value={articleDraft.title} onChange={(event) => setArticleDraft({ ...articleDraft, title: event.target.value })} />
                <SelectField label="Category" value={articleDraft.category} onChange={(event) => setArticleDraft({ ...articleDraft, category: event.target.value })}>
                  {HELP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                </SelectField>
              </div>
              <TextAreaField label="Content" value={articleDraft.content} onChange={(event) => setArticleDraft({ ...articleDraft, content: event.target.value })} className="min-h-32" />
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Tags" value={articleDraft.tagsText} onChange={(event) => setArticleDraft({ ...articleDraft, tagsText: event.target.value })} placeholder="barcode, checkout, receipt" />
                <SelectField label="Visibility" value={articleDraft.visibility} onChange={(event) => setArticleDraft({ ...articleDraft, visibility: event.target.value as ArticleDraft["visibility"] })}>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="public">Public</option>
                </SelectField>
                <label className="flex min-w-0 items-center justify-between gap-3 rounded-card border border-white/10 bg-black/30 px-3 text-sm font-bold text-teal-50">
                  Published
                  <input type="checkbox" checked={articleDraft.published} onChange={(event) => setArticleDraft({ ...articleDraft, published: event.target.checked })} />
                </label>
              </div>
              {articleMessage ? <p className="rounded-card bg-white/[0.07] p-3 text-sm font-bold text-cyan-100">{articleMessage}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={saveArticle} disabled={busy === "article"}>
                  <PlusCircle className="h-4 w-4" />
                  {busy === "article" ? "Saving..." : "Save article"}
                </Button>
                {editingArticleId ? (
                  <Button onClick={() => { setEditingArticleId(""); setArticleDraft(emptyArticleDraft); }}>
                    Cancel edit
                  </Button>
                ) : null}
              </div>
            </div>
          </Panel>
        ) : null}
      </div>

      <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-24">
        <Panel>
          <PanelHeader title="Contact Support" description="Report a problem or request a feature" action={<LifeBuoy className="h-5 w-5 text-cyan-100" />} />
          <div className="grid gap-3 p-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <Field label="Name" value={ticketDraft.name} onChange={(event) => setTicketDraft({ ...ticketDraft, name: event.target.value })} />
              <Field label="Business name" value={ticketDraft.business_name} onChange={(event) => setTicketDraft({ ...ticketDraft, business_name: event.target.value })} />
              <Field label="Email" value={ticketDraft.email} onChange={(event) => setTicketDraft({ ...ticketDraft, email: event.target.value })} />
              <Field label="Phone / WhatsApp" value={ticketDraft.phone} onChange={(event) => setTicketDraft({ ...ticketDraft, phone: event.target.value })} />
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <SelectField label="Issue category" value={ticketDraft.issue_category} onChange={(event) => setTicketDraft({ ...ticketDraft, issue_category: event.target.value })}>
                {HELP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </SelectField>
              <SelectField label="Priority" value={ticketDraft.priority} onChange={(event) => setTicketDraft({ ...ticketDraft, priority: event.target.value as SupportTicketPriority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </SelectField>
            </div>
            <TextAreaField label="Message" value={ticketDraft.message} onChange={(event) => setTicketDraft({ ...ticketDraft, message: event.target.value })} className="min-h-32" />
            <label className="grid gap-1.5 text-sm font-bold text-teal-50">
              Screenshot upload
              <input type="file" accept="image/png,image/jpeg" onChange={handleScreenshot} className="rounded-card border border-white/10 bg-black/30 px-3 py-2 text-sm font-semibold text-white" />
            </label>
            {ticketDraft.screenshot_url ? <Badge tone="green">Screenshot attached</Badge> : null}
            {ticketMessage ? <p className="rounded-card bg-white/[0.07] p-3 text-sm font-bold text-cyan-100">{ticketMessage}</p> : null}
            <Button variant="primary" onClick={submitTicket} disabled={busy === "ticket" || ticketDraft.message.trim().length < 10}>
              <MessageCircle className="h-4 w-4" />
              {busy === "ticket" ? "Submitting..." : "Submit ticket"}
            </Button>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="AI Troubleshooting" description="Guided flows for common problems" />
          <div className="grid gap-2 p-4">
            {[
              "Login not working",
              "Barcode scanner not working",
              "WhatsApp messages not sending",
              "Order not saving",
              "Customer not saving",
              "Inventory not updating",
              "Vercel/Supabase database issue"
            ].map((item) => (
              <Button key={item} variant="ghost" className="justify-start" onClick={() => askSupport(`Troubleshooting mode: ${item}. Ask me one step at a time.`)}>
                <Wrench className="h-4 w-4" />
                {item}
              </Button>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="System Status" />
          <div className="grid gap-2 p-4 text-sm font-bold">
            <p className="flex items-center justify-between gap-3 rounded-card bg-black/20 px-3 py-2">
              <span>Database configured</span>
              <Badge tone={systemStatus.databaseConfigured ? "green" : "red"}>{systemStatus.databaseConfigured ? "Yes" : "No"}</Badge>
            </p>
            <p className="flex items-center justify-between gap-3 rounded-card bg-black/20 px-3 py-2">
              <span>AI support</span>
              <Badge tone={aiStatus.enabled ? "green" : "amber"}>{aiStatus.enabled ? "Ready" : "Fallback"}</Badge>
            </p>
            <p className="flex items-center justify-between gap-3 rounded-card bg-black/20 px-3 py-2">
              <span>Environment</span>
              <Badge tone="teal">{systemStatus.vercelEnv || systemStatus.nodeEnv}</Badge>
            </p>
            <a href="/api/health" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-card border border-white/10 bg-white/[0.07] px-3 text-sm font-black text-white">
              <AlertTriangle className="h-4 w-4" />
              Open health check
            </a>
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Support Tickets" description={canManage ? "All submitted tickets" : "Your submitted tickets"} action={<Badge tone="teal">{tickets.length}</Badge>} />
          <div className="grid max-h-[560px] gap-3 overflow-y-auto p-4">
            {tickets.length === 0 ? (
              <p className="rounded-card bg-black/20 p-3 text-sm font-bold text-teal-50/70">No support tickets yet.</p>
            ) : null}
            {tickets.map((ticket) => (
              <div key={ticket.id} className="grid gap-2 rounded-card border border-white/10 bg-black/20 p-3">
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-black leading-tight">{ticket.ticket_number}</p>
                    <p className="text-xs font-bold text-cyan-100/60">{ticket.issue_category}</p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1">
                    <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
                    <Badge tone={statusTone[ticket.status]}>{labelize(ticket.status)}</Badge>
                  </div>
                </div>
                <p className="text-sm font-semibold text-teal-50/75">{ticket.message}</p>
                {ticket.ai_summary ? (
                  <p className="rounded-card bg-white/[0.06] p-2 text-xs font-bold text-cyan-100/72">
                    <Bot className="mr-1 inline h-3.5 w-3.5" />
                    {ticket.ai_summary}
                  </p>
                ) : null}
                {canManage ? (
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-1">
                    <select
                      value={ticket.status}
                      onChange={(event) => updateTicket(ticket.id, { status: event.target.value as SupportTicketStatus })}
                      disabled={busy === ticket.id}
                      className="h-9 rounded-card border border-white/10 bg-black/30 px-2 text-xs font-bold text-white"
                    >
                      {["new", "open", "waiting_on_customer", "resolved", "closed"].map((status) => (
                        <option key={status} value={status}>{labelize(status)}</option>
                      ))}
                    </select>
                    <select
                      value={ticket.priority}
                      onChange={(event) => updateTicket(ticket.id, { priority: event.target.value as SupportTicketPriority })}
                      disabled={busy === ticket.id}
                      className="h-9 rounded-card border border-white/10 bg-black/30 px-2 text-xs font-bold text-white"
                    >
                      {["low", "medium", "high", "urgent"].map((priority) => (
                        <option key={priority} value={priority}>{labelize(priority)}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title="Safe Support Rules" />
          <div className="grid gap-2 p-4 text-sm font-semibold text-teal-50/75">
            <p className="flex gap-2"><FileQuestion className="h-4 w-4 text-cyan-100" /> The assistant answers from app help content and your role.</p>
            <p className="flex gap-2"><AlertTriangle className="h-4 w-4 text-amber-100" /> It will not reveal secrets, API keys, database passwords, or private records.</p>
          </div>
        </Panel>
      </aside>
    </div>
  );
}
