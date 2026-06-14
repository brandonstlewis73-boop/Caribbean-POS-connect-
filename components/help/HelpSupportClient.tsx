"use client";

import { useMemo, useState, type ChangeEvent } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  FileQuestion,
  LifeBuoy,
  MessageCircle,
  PackagePlus,
  Search,
  Send,
  Settings as SettingsIcon,
  ShoppingCart,
  Store,
  Tags,
  UserPlus
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Field, SelectField, TextAreaField } from "@/components/ui/Field";
import { Panel, PanelHeader } from "@/components/ui/Panel";
import { readApiPayload } from "@/lib/client-response";
import { GETTING_STARTED_CHECKLIST, HELP_CATEGORIES } from "@/lib/support-context";
import type { HelpArticle, Settings, SupportTicket, SupportTicketPriority, SupportTicketStatus, User } from "@/lib/types";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  configured?: boolean;
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

type GuideCard = {
  id: string;
  title: string;
  description: string;
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  steps: string[];
};

const guideCards: GuideCard[] = [
  {
    id: "add-product",
    title: "How to add a product",
    description: "Create products with price, stock, image, SKU, barcode, and category.",
    category: "Products & Categories",
    icon: PackagePlus,
    steps: ["Open Inventory.", "Select Add product.", "Enter product details and category.", "Save and confirm the item appears in POS and storefront."]
  },
  {
    id: "create-categories",
    title: "How to create categories",
    description: "Organize products so checkout and storefront browsing stay clean.",
    category: "Products & Categories",
    icon: Tags,
    steps: ["Open Settings.", "Find Categories.", "Add or rename a category.", "Save changes and check POS filters."]
  },
  {
    id: "order-status",
    title: "How to change order status",
    description: "Move orders from New to Accepted, Preparing, Ready, Out for Delivery, Completed, or Cancelled.",
    category: "Orders & Checkout",
    icon: ClipboardList,
    steps: ["Open Orders.", "Select the order.", "Use the status action button.", "Confirm the customer notification if enabled."]
  },
  {
    id: "twilio-whatsapp",
    title: "How to connect Twilio/WhatsApp",
    description: "Set Twilio credentials in Vercel and enable business WhatsApp settings.",
    category: "WhatsApp/SMS Notifications",
    icon: MessageCircle,
    steps: ["Add Twilio env vars in Vercel Production.", "Redeploy the app.", "Open Settings and add the business WhatsApp number.", "Send a test message."]
  },
  {
    id: "whatsapp-sandbox",
    title: "Why WhatsApp sandbox messages fail",
    description: "Fix the common Twilio sandbox issue where the receiving phone has not joined.",
    category: "Troubleshooting",
    icon: AlertTriangle,
    steps: ["Open Twilio WhatsApp Sandbox.", "Join the sandbox from the receiving phone.", "Use whatsapp:+countrycode format.", "Try the test message again."]
  },
  {
    id: "storefront",
    title: "How to customize the storefront",
    description: "Update store name, logo, hours, pickup, delivery, and storefront link.",
    category: "Storefront Setup",
    icon: Store,
    steps: ["Open Settings.", "Update Business Profile and Storefront Settings.", "Upload the logo if needed.", "Open the storefront link and place a test order."]
  },
  {
    id: "customers",
    title: "How to add customers",
    description: "Save customer contact and delivery details for checkout and delivery.",
    category: "Customers",
    icon: UserPlus,
    steps: ["Open Customers.", "Add name and phone.", "Add delivery address if needed.", "Save and confirm the customer appears in checkout."]
  },
  {
    id: "export-orders",
    title: "How to export orders",
    description: "Download sales/order data for accounting and daily review.",
    category: "Reports",
    icon: ShoppingCart,
    steps: ["Open Reports.", "Choose the date range.", "Select export if available.", "Review the downloaded sales file."]
  },
  {
    id: "ai-marketing",
    title: "How to use AI marketing tools",
    description: "Generate promo ideas, product descriptions, and slow-day sales suggestions.",
    category: "AI Features",
    icon: Bot,
    steps: ["Open AI tools.", "Choose the business task.", "Review the generated answer.", "Edit before saving, sending, or applying."]
  },
  {
    id: "missing-env",
    title: "How to fix missing environment variables",
    description: "Use the health check to see which production settings are missing.",
    category: "Troubleshooting",
    icon: SettingsIcon,
    steps: ["Open /api/health.", "Read only the safe missing-variable names.", "Add values in Vercel Production.", "Redeploy before testing again."]
  }
];

const supportSections = [
  "Search help articles",
  "Getting Started",
  "Orders & Checkout",
  "Products & Categories",
  "Customers",
  "Storefront Setup",
  "WhatsApp/SMS Notifications",
  "AI Features",
  "Billing & Subscriptions",
  "Troubleshooting",
  "Contact Support"
];

const troubleshootingCards = [
  {
    title: "Twilio Error 63015",
    description: "The receiving WhatsApp number has not joined the Twilio sandbox or the sender is not approved.",
    fix: "Join the sandbox from the receiving phone, confirm TWILIO_WHATSAPP_FROM uses whatsapp:+number, then send a test message."
  },
  {
    title: "Missing OPENAI_API_KEY",
    description: "AI Support is unavailable until the server has an OpenAI key.",
    fix: "Add OPENAI_API_KEY and AI_SUPPORT_ENABLED=true in Vercel Production, then redeploy."
  },
  {
    title: "Missing Twilio environment variables",
    description: "WhatsApp or SMS messages cannot send without provider credentials.",
    fix: "Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, and TWILIO_PHONE_NUMBER if SMS is used."
  },
  {
    title: "Storefront items not showing",
    description: "Products may be inactive, uncategorized, out of stock, or tied to a different business.",
    fix: "Check Inventory product status, category visibility, storefront status, and business account selection."
  },
  {
    title: "Orders not saving",
    description: "This is usually database connectivity, validation, or a missing customer/order field.",
    fix: "Open /api/health, confirm database connected, then test one small checkout with customer name and phone."
  },
  {
    title: "Customer notifications failing",
    description: "Notification preferences, provider credentials, phone formatting, or plan limits may block sends.",
    fix: "Check Settings notification toggles, WhatsApp test message, customer phone format, and subscription limits."
  },
  {
    title: "Categories not updating",
    description: "POS and storefront depend on saved active categories for the current business.",
    fix: "Rename or add the category in Settings, keep it active, then refresh POS/storefront if needed."
  },
  {
    title: "Build or deployment issues",
    description: "Production changes require a fresh Vercel deployment and valid Production environment variables.",
    fix: "Check Vercel build logs, confirm env vars are in Production, and redeploy the latest main branch."
  }
];

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
  systemStatus: { databaseConfigured: boolean; vercelEnv: string | null; nodeEnv: string };
}) {
  const [tickets, setTickets] = useState(initialTickets);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [activeGuideId, setActiveGuideId] = useState(guideCards[0].id);
  const [activeTrouble, setActiveTrouble] = useState(troubleshootingCards[0].title);
  const [chatInput, setChatInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: aiStatus.enabled
        ? "Ask a question about using Caribbean POS Connect. I can help with setup, checkout, products, customers, storefront, WhatsApp, AI features, and billing."
        : "AI Support is not configured yet. Add OPENAI_API_KEY to enable this feature.",
      configured: aiStatus.enabled
    }
  ]);
  const [ticketDraft, setTicketDraft] = useState<TicketDraft>({
    name: user.name || "",
    business_name: settings.business_name || "",
    email: user.email || "",
    phone: user.phone || settings.business_phone || "",
    issue_category: "Troubleshooting",
    priority: "medium",
    message: "",
    screenshot_url: ""
  });
  const [ticketMessage, setTicketMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const activeGuide = guideCards.find((guide) => guide.id === activeGuideId) || guideCards[0];
  const activeTroubleshooting = troubleshootingCards.find((card) => card.title === activeTrouble) || troubleshootingCards[0];

  const filteredGuideCards = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return guideCards.filter((card) => {
      const categoryMatch = selectedCategory === "All" || card.category === selectedCategory;
      const searchMatch = !needle || [card.title, card.description, card.category, ...card.steps].join(" ").toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [search, selectedCategory]);

  const filteredArticles = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return initialArticles.filter((article) => {
      const categoryMatch = selectedCategory === "All" || article.category === selectedCategory;
      const searchMatch = !needle || [article.title, article.category, article.content, ...article.tags].join(" ").toLowerCase().includes(needle);
      return categoryMatch && searchMatch;
    });
  }, [initialArticles, search, selectedCategory]);

  function validateTicket() {
    if (ticketDraft.name.trim().length < 2) return "Enter your name.";
    if (!ticketDraft.email.includes("@")) return "Enter a valid email address.";
    if (!ticketDraft.issue_category.trim()) return "Choose an issue category.";
    if (ticketDraft.message.trim().length < 10) return "Tell us what happened in at least 10 characters.";
    return "";
  }

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
      if (!response.ok || !payload.data) throw new Error(payload.error || "Support chat could not answer.");
      setChatMessages((current) => [...current, { role: "assistant", content: payload.data!.answer, configured: payload.data!.configured }]);
    } catch (error) {
      setChatMessages((current) => [
        ...current,
        { role: "assistant", content: error instanceof Error ? error.message : "Support chat could not answer. Submit a support request for help." }
      ]);
    } finally {
      setChatBusy(false);
    }
  }

  async function submitTicket() {
    const validation = validateTicket();
    setTicketMessage(null);
    if (validation) {
      setTicketMessage({ tone: "error", text: validation });
      return;
    }
    setBusy("ticket");
    try {
      const response = await fetch("/api/help/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ticketDraft)
      });
      const payload = await readApiPayload<{ ticket: SupportTicket }>(response);
      if (!response.ok || !payload.data?.ticket) throw new Error(payload.error || "Support request could not be submitted.");
      setTickets((current) => [payload.data!.ticket, ...current]);
      setTicketDraft((current) => ({ ...current, message: "", screenshot_url: "" }));
      setTicketMessage({ tone: "success", text: `Support request ${payload.data.ticket.ticket_number} submitted.` });
    } catch (error) {
      setTicketMessage({ tone: "error", text: error instanceof Error ? error.message : "Support request could not be submitted." });
    } finally {
      setBusy("");
    }
  }

  async function updateTicket(id: string, patch: Partial<SupportTicket>) {
    if (!canManage) return;
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

  async function handleScreenshot(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 650 * 1024) {
      setTicketMessage({ tone: "error", text: "Screenshot must be under 650 KB." });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setTicketDraft((current) => ({ ...current, screenshot_url: dataUrl }));
    setTicketMessage({ tone: "success", text: "Screenshot attached." });
  }

  return (
    <div className="grid min-w-0 gap-4 pb-20 lg:pb-4">
      <section className="grid gap-3 rounded-card border border-white/10 bg-slate-950/50 p-4 sm:p-5">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase tracking-wide text-cyan-100/70">Help & Support</p>
            <h1 className="mt-2 text-2xl font-black text-white sm:text-3xl">Get help running your POS</h1>
            <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-teal-50/70">
              Search guides, troubleshoot setup issues, ask AI Support, or submit a support request tied to your business account.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={systemStatus.databaseConfigured ? "green" : "red"}>{systemStatus.databaseConfigured ? "Database ready" : "Database not configured"}</Badge>
            <Badge tone={aiStatus.enabled ? "green" : "amber"}>{aiStatus.enabled ? "AI ready" : "AI not configured"}</Badge>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="grid min-w-0 gap-4">
          <Panel>
            <PanelHeader title="Search Help Articles" description="Find setup guides and troubleshooting steps for real POS workflows." />
            <div className="grid gap-3 p-4 sm:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]">
                <label htmlFor="help-search" className="relative block min-w-0">
                  <span className="sr-only">Search help articles</span>
                  <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-cyan-100/55" />
                  <input
                    id="help-search"
                    name="helpSearch"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="min-h-11 w-full min-w-0 rounded-card border border-white/10 bg-slate-950/45 pl-9 pr-3 text-sm font-semibold text-white outline-none focus:border-cyan-300 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="Search products, orders, WhatsApp, billing, storefront..."
                  />
                </label>
                <div className="grid gap-1">
                  <label htmlFor="help-category-filter" className="sr-only">Select support category</label>
                  <select
                    id="help-category-filter"
                    name="supportCategory"
                    value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="min-h-11 w-full rounded-card border border-white/10 bg-slate-950/45 px-3 text-sm font-semibold text-white outline-none focus:border-cyan-300"
                >
                  <option>All</option>
                  {HELP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {supportSections.map((section) => (
                  <button
                    key={section}
                    type="button"
                    onClick={() => setSelectedCategory(section === "Search help articles" || section === "Contact Support" ? "All" : section)}
                    className="min-h-9 shrink-0 rounded-card border border-white/10 bg-white/[0.06] px-3 text-sm font-black text-teal-50 hover:bg-white/[0.1]"
                  >
                    {section}
                  </button>
                ))}
              </div>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
            <Panel>
              <PanelHeader title="Useful Guides" description="Practical help cards for common setup and daily operations." action={<Badge tone="teal">{filteredGuideCards.length}</Badge>} />
              <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
                {filteredGuideCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <article key={card.id} className="grid min-w-0 gap-3 rounded-card border border-white/10 bg-black/20 p-4">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-cyan-300/12 text-cyan-100">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="min-w-0">
                          <h2 className="text-sm font-black leading-tight text-white">{card.title}</h2>
                          <p className="mt-1 text-xs font-bold text-cyan-100/60">{card.category}</p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold leading-6 text-teal-50/72">{card.description}</p>
                      <Button type="button" variant={activeGuideId === card.id ? "primary" : "secondary"} onClick={() => setActiveGuideId(card.id)} className="w-full sm:w-auto">
                        View guide
                      </Button>
                    </article>
                  );
                })}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title={activeGuide.title} description={activeGuide.category} />
              <div className="grid gap-3 p-4 sm:p-5">
                {activeGuide.steps.map((step, index) => (
                  <p key={step} className="flex gap-3 rounded-card bg-white/[0.055] p-3 text-sm font-semibold leading-6 text-teal-50/78">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-300 text-xs font-black text-slate-950">{index + 1}</span>
                    {step}
                  </p>
                ))}
                <Button type="button" variant="ghost" onClick={() => askSupport(`Help me with: ${activeGuide.title}`)}>
                  <Bot className="h-4 w-4" />
                  Ask AI about this
                </Button>
              </div>
            </Panel>
          </div>

          <Panel>
            <PanelHeader title="Knowledge Base" description="Saved help articles available to your role." action={<Badge tone="teal">{filteredArticles.length}</Badge>} />
            <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
              {filteredArticles.length === 0 ? (
                <p className="rounded-card bg-black/20 p-3 text-sm font-bold text-teal-50/72 md:col-span-2">No articles match that search.</p>
              ) : null}
              {filteredArticles.map((article) => (
                <article key={article.id} className="grid gap-2 rounded-card border border-white/10 bg-black/20 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="text-sm font-black leading-tight text-white">{article.title}</h2>
                      <p className="mt-1 text-xs font-bold text-cyan-100/60">{article.category}</p>
                    </div>
                    <Badge tone={article.visibility === "admin" ? "amber" : article.visibility === "public" ? "green" : "teal"}>{article.visibility}</Badge>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-teal-50/72">{article.content}</p>
                  {article.tags.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {article.tags.map((tag) => <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-black text-cyan-100/75">{tag}</span>)}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel>
              <PanelHeader title="Setup Checklist" description="Use these steps when setting up a business account." />
              <div className="grid gap-2 p-4 sm:p-5">
                {GETTING_STARTED_CHECKLIST.map((item) => (
                  <p key={item} className="flex min-w-0 items-center gap-2 rounded-card bg-white/[0.055] px-3 py-2 text-sm font-bold text-teal-50/82">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-200" />
                    {item}
                  </p>
                ))}
              </div>
            </Panel>

            <Panel>
              <PanelHeader title="Troubleshooting" description="Quick fixes for common production issues." />
              <div className="grid gap-3 p-4 sm:p-5">
                <div className="grid gap-2">
                  {troubleshootingCards.map((card) => (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => setActiveTrouble(card.title)}
                      className={`rounded-card border px-3 py-2 text-left text-sm font-black transition ${
                        activeTrouble === card.title ? "border-cyan-300/50 bg-cyan-300/12 text-white" : "border-white/10 bg-black/20 text-teal-50/78 hover:bg-white/[0.08]"
                      }`}
                    >
                      {card.title}
                    </button>
                  ))}
                </div>
                <div className="rounded-card border border-white/10 bg-black/25 p-3">
                  <p className="font-black text-white">{activeTroubleshooting.title}</p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-teal-50/72">{activeTroubleshooting.description}</p>
                  <p className="mt-3 rounded-card bg-white/[0.06] p-3 text-sm font-bold leading-6 text-cyan-50">{activeTroubleshooting.fix}</p>
                </div>
              </div>
            </Panel>
          </div>
        </div>

        <aside className="grid min-w-0 gap-4 self-start xl:sticky xl:top-24">
          <Panel>
            <PanelHeader title="Ask AI Support" description="Optional assistant for POS setup and troubleshooting." action={<Badge tone={aiStatus.enabled ? "green" : "amber"}>{aiStatus.enabled ? aiStatus.model : "Not configured"}</Badge>} />
            <div className="grid gap-3 p-4 sm:p-5">
              {!aiStatus.enabled ? (
                <p className="rounded-card border border-amber-200/20 bg-amber-300/10 p-3 text-sm font-bold leading-6 text-amber-50">
                  AI Support is not configured yet. Add OPENAI_API_KEY to enable this feature.
                </p>
              ) : null}
              <div className="grid max-h-80 gap-3 overflow-y-auto rounded-card border border-white/10 bg-black/25 p-3">
                {chatMessages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={message.role === "user" ? "ml-auto max-w-[92%] rounded-card bg-cyan-300 px-3 py-2 text-sm font-bold text-slate-950" : "mr-auto max-w-[94%] rounded-card bg-white/[0.08] px-3 py-2 text-sm font-semibold text-teal-50"}
                  >
                    <p className="whitespace-pre-wrap leading-6">{message.content}</p>
                  </div>
                ))}
                {chatBusy ? <p className="text-sm font-bold text-cyan-100/70">AI Support is checking the help context...</p> : null}
              </div>
              <div className="grid gap-2">
                <label htmlFor="ai-support-question" className="sr-only">Ask AI Support question</label>
                <textarea
                  id="ai-support-question"
                  name="aiSupportQuestion"
                  value={chatInput}
                  onChange={(event) => setChatInput(event.target.value)}
                  className="min-h-24 w-full rounded-card border border-white/10 bg-slate-950/45 px-3 py-3 text-sm font-semibold text-white outline-none focus:border-cyan-300"
                  placeholder="Ask about products, orders, customers, storefront, Twilio, AI features, or billing."
                />
                <Button type="button" variant="primary" onClick={() => askSupport()} disabled={chatBusy || !chatInput.trim()}>
                  <Send className="h-4 w-4" />
                  Send question
                </Button>
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Contact Support" description="Submit a real support request for this business." action={<LifeBuoy className="h-5 w-5 text-cyan-100" />} />
            <div className="grid gap-3 p-4 sm:p-5">
              <Field id="support-name" name="supportName" label="Name" value={ticketDraft.name} onChange={(event) => setTicketDraft({ ...ticketDraft, name: event.target.value })} />
              <Field id="support-email" name="supportEmail" label="Email" type="email" value={ticketDraft.email} onChange={(event) => setTicketDraft({ ...ticketDraft, email: event.target.value })} />
              <Field id="support-business-name" name="supportBusinessName" label="Business name" value={ticketDraft.business_name} onChange={(event) => setTicketDraft({ ...ticketDraft, business_name: event.target.value })} />
              <SelectField id="support-issue-category" name="supportIssueCategory" label="Issue category" value={ticketDraft.issue_category} onChange={(event) => setTicketDraft({ ...ticketDraft, issue_category: event.target.value })}>
                {HELP_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </SelectField>
              <SelectField id="support-priority" name="supportPriority" label="Priority" value={ticketDraft.priority} onChange={(event) => setTicketDraft({ ...ticketDraft, priority: event.target.value as SupportTicketPriority })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </SelectField>
              <TextAreaField id="support-message" name="supportMessage" label="Message" value={ticketDraft.message} onChange={(event) => setTicketDraft({ ...ticketDraft, message: event.target.value })} placeholder="Tell us what happened and what you already tried." />
              <label htmlFor="support-screenshot" className="grid gap-2 text-sm font-bold text-teal-50">
                <span className="text-teal-50/86">Screenshot upload</span>
                <input id="support-screenshot" name="supportScreenshot" type="file" accept="image/png,image/jpeg" onChange={handleScreenshot} className="rounded-card border border-white/10 bg-slate-950/45 px-3 py-2 text-sm font-semibold text-white" />
              </label>
              {ticketDraft.screenshot_url ? <Badge tone="green">Screenshot attached</Badge> : null}
              {ticketMessage ? (
                <p className={`rounded-card p-3 text-sm font-bold leading-6 ${ticketMessage.tone === "success" ? "bg-emerald-300/12 text-emerald-50" : "bg-red-400/12 text-red-50"}`}>
                  {ticketMessage.text}
                </p>
              ) : null}
              <Button type="button" variant="primary" onClick={submitTicket} disabled={busy === "ticket"}>
                <MessageCircle className="h-4 w-4" />
                {busy === "ticket" ? "Submitting..." : "Submit support request"}
              </Button>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Support Requests" description={canManage ? "Tickets for this business" : "Your submitted tickets"} action={<Badge tone="teal">{tickets.length}</Badge>} />
            <div className="grid max-h-[520px] gap-3 overflow-y-auto p-4 sm:p-5">
              {tickets.length === 0 ? (
                <p className="rounded-card bg-black/20 p-3 text-sm font-bold text-teal-50/72">No support requests yet.</p>
              ) : null}
              {tickets.map((ticket) => (
                <article key={ticket.id} className="grid gap-2 rounded-card border border-white/10 bg-black/20 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-black leading-tight text-white">{ticket.ticket_number}</p>
                      <p className="text-xs font-bold text-cyan-100/60">{ticket.issue_category}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1">
                      <Badge tone={priorityTone[ticket.priority]}>{ticket.priority}</Badge>
                      <Badge tone={statusTone[ticket.status]}>{labelize(ticket.status)}</Badge>
                    </div>
                  </div>
                  <p className="text-sm font-semibold leading-6 text-teal-50/75">{ticket.message}</p>
                  {ticket.ai_summary ? (
                    <p className="rounded-card bg-white/[0.06] p-2 text-xs font-bold leading-5 text-cyan-100/72">
                      <Bot className="mr-1 inline h-3.5 w-3.5" />
                      {ticket.ai_summary}
                    </p>
                  ) : null}
                  {canManage ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                      <label htmlFor={`ticket-status-${ticket.id}`} className="sr-only">Select issue type for {ticket.ticket_number}</label>
                      <select id={`ticket-status-${ticket.id}`} name={`ticketStatus-${ticket.id}`} value={ticket.status} onChange={(event) => updateTicket(ticket.id, { status: event.target.value as SupportTicketStatus })} disabled={busy === ticket.id} className="min-h-9 rounded-card border border-white/10 bg-slate-950/45 px-2 text-xs font-bold text-white">
                        {["new", "open", "waiting_on_customer", "resolved", "closed"].map((status) => <option key={status} value={status}>{labelize(status)}</option>)}
                      </select>
                      <label htmlFor={`ticket-priority-${ticket.id}`} className="sr-only">Select priority for {ticket.ticket_number}</label>
                      <select id={`ticket-priority-${ticket.id}`} name={`ticketPriority-${ticket.id}`} value={ticket.priority} onChange={(event) => updateTicket(ticket.id, { priority: event.target.value as SupportTicketPriority })} disabled={busy === ticket.id} className="min-h-9 rounded-card border border-white/10 bg-slate-950/45 px-2 text-xs font-bold text-white">
                        {["low", "medium", "high", "urgent"].map((priority) => <option key={priority} value={priority}>{labelize(priority)}</option>)}
                      </select>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Support Safety" />
            <div className="grid gap-2 p-4 text-sm font-semibold leading-6 text-teal-50/75 sm:p-5">
              <p className="flex gap-2"><FileQuestion className="mt-1 h-4 w-4 shrink-0 text-cyan-100" /> AI answers use app help context and your logged-in role.</p>
              <p className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-100" /> Secrets, API keys, database URLs, and private tenant data are never shown in support chat.</p>
              <p className="flex gap-2"><CreditCard className="mt-1 h-4 w-4 shrink-0 text-cyan-100" /> Billing help explains setup steps; payment credentials stay in Stripe and Vercel.</p>
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}


